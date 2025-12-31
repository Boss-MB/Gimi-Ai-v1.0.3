document.addEventListener('DOMContentLoaded', () => {
    // --- SAFE PARSER (Crash Proof) ---
    const safeParse = (text) => {
        if (typeof marked !== 'undefined') return marked.parse(text);
        return text.replace(/\n/g, '<br>');
    };

    console.log("System Online.");

    const chatZone = document.getElementById('chat-stream');
    const inpField = document.getElementById('input-msg');
    const btnSend = document.getElementById('action-send');
    const btnMic = document.getElementById('action-mic');
    const btnAttach = document.getElementById('action-attach');
    const hiddenFile = document.getElementById('input-file-hidden');
    const modal = document.getElementById('view-modal');

    let recognition;
    let isAutoMode = false;

    // Welcome Message
    setTimeout(() => pushMsg("Hello! I am ready.", 'bot'), 500);

    const scrollDown = () => {
        if(chatZone) chatZone.scrollTo({ top: chatZone.scrollHeight, behavior: 'smooth' });
    };

    if(modal) {
        window.closeModal = () => modal.style.display = 'none';
        modal.onclick = () => modal.style.display = 'none';
    }

    // --- NEW LOGIC: Toggle Mic/Send ---
    // Type karte hi Send button aayega, Mic hat jayega
    const toggleButtons = () => {
        const txt = inpField.value.trim();
        if(txt.length > 0) {
            btnMic.style.display = 'none';
            btnSend.style.display = 'flex';
        } else {
            btnMic.style.display = 'flex';
            btnSend.style.display = 'none';
        }
    };

    if(inpField) {
        inpField.addEventListener('input', toggleButtons);
        inpField.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); triggerSend(); }
        });
    }

    const triggerSend = () => {
        const txt = inpField.value.trim();
        if(!txt) return;

        isAutoMode = false;
        if(recognition) recognition.stop();
        
        runCmd(txt, false);
        inpField.value = '';
        toggleButtons(); // Wapas Mic laao
    };

    if(btnSend) btnSend.onclick = triggerSend;

    // Attach File
    if(btnAttach && hiddenFile) {
        btnAttach.onclick = () => hiddenFile.click();
        hiddenFile.onchange = async () => {
            if (!hiddenFile.files[0]) return;
            const fd = new FormData();
            fd.append('file', hiddenFile.files[0]);
            pushMsg(`Reading ${hiddenFile.files[0].name}...`, 'user');
            try {
                const r = await fetch('/upload_file', { method: 'POST', body: fd });
                const d = await r.json();
                pushMsg(d.message, 'bot');
            } catch { pushMsg("Upload failed.", 'bot'); }
            hiddenFile.value = ''; 
        };
    }

    // Mic Logic
    const startRecognition = () => {
        if (!window.webkitSpeechRecognition) return alert("Mic not supported.");
        if (recognition && recognition.started) return;
        
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-IN'; 
        recognition.interimResults = false;
        recognition.started = true;
        
        recognition.onstart = () => { btnMic.style.color = '#ff4757'; };
        recognition.onend = () => { recognition.started = false; btnMic.style.color = '#888'; };
        recognition.onresult = (e) => {
            const t = e.results[e.results.length-1][0].transcript;
            inpField.value = t;
            toggleButtons(); 
            runCmd(t, true); 
        };
        try { recognition.start(); } catch(e) {}
    };

    if(btnMic) {
        btnMic.onclick = () => {
            if (isAutoMode) { 
                isAutoMode = false; 
                if(recognition) recognition.stop();
            } else { 
                isAutoMode = true; 
                startRecognition(); 
            }
        };
    }

    const playAudio = (b64) => {
        if (!b64) { if (isAutoMode) startRecognition(); return; }
        const audio = new Audio("data:audio/mp3;base64," + b64);
        audio.play().catch(e => {});
        audio.onended = () => { if (isAutoMode) startRecognition(); };
    };

    const pushMsg = (txt, role, isImg=false) => {
        const row = document.createElement('div');
        row.className = `msg-row row-${role}`;
        const bub = document.createElement('div');
        bub.className = `bubble bub-${role}`;
        
        if(isImg) {
            bub.innerHTML = `Generated Image:<br><img src='data:image/jpeg;base64,${txt}' onclick="document.getElementById('view-full-img').src=this.src;document.getElementById('view-modal').style.display='flex'">`;
        } else {
            bub.innerHTML = safeParse(txt);
        }
        
        row.appendChild(bub);
        chatZone.appendChild(row);
        
        if (role === 'user') scrollDown();
        else row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        return row; 
    };

    const runCmd = async (cmd, voiceMode) => {
        pushMsg(cmd, 'user');
        const loadRow = pushMsg("Thinking...", 'bot');
        
        try {
            const req = await fetch('/execute_command', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ command: cmd, is_voice: voiceMode })
            });
            loadRow.remove();
            const res = await req.json();
            
            if (res.is_image) {
                pushMsg(res.image_data, 'bot', true);
                if(isAutoMode) startRecognition();
            } else {
                pushMsg(res.response, 'bot');
            }

            if (res.audio_data) playAudio(res.audio_data);
            else if (isAutoMode) startRecognition();

        } catch (e) {
            loadRow.remove();
            pushMsg("Error connecting.", 'bot');
        }
    };
});
    inpField.addEventListener('input', () => {
        const txt = inpField.value.trim();
        if(txt) {
            btnSend.classList.add('ready');
        } else {
            btnSend.classList.remove('ready');
        }
    });

    const triggerSend = () => {
        const txt = inpField.value.trim();
        if(!txt) return; // Empty text mat bhejo

        isAutoMode = false;
        btnMic.classList.remove('active');
        stopRecognition();
        
        runCmd(txt, false);
        btnSend.classList.remove('ready');
    };

    // DIRECT CLICK LISTENERS
    btnSend.onclick = triggerSend;
    inpField.onkeydown = (e) => { 
        if (e.key === 'Enter') { e.preventDefault(); triggerSend(); }
    };

    // ATTACH
    if(btnAttach && hiddenFile) {
        btnAttach.onclick = () => hiddenFile.click();
        hiddenFile.onchange = async () => {
            if (!hiddenFile.files[0]) return;
            const fd = new FormData();
            fd.append('file', hiddenFile.files[0]);
            pushMsg(`Reading ${hiddenFile.files[0].name}...`, 'user');
            try {
                const r = await fetch('/upload_file', { method: 'POST', body: fd });
                const d = await r.json();
                pushMsg(d.message, 'bot');
            } catch { pushMsg("Upload failed.", 'bot'); }
            hiddenFile.value = ''; 
        };
    }

    // MIC SETUP
    const startRecognition = () => {
        if (!window.webkitSpeechRecognition) return alert("Mic Error");
        if (recognition && recognition.started) return;
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-IN'; 
        recognition.interimResults = false;
        recognition.started = true;
        recognition.onstart = () => { btnMic.classList.add('active'); };
        recognition.onend = () => { recognition.started = false; };
        recognition.onresult = (e) => {
            const t = e.results[e.results.length-1][0].transcript;
            inpField.value = t;
            btnSend.classList.add('ready');
            runCmd(t, true); 
        };
        try { recognition.start(); } catch(e) {}
    };

    const stopRecognition = () => {
        isAutoMode = false;
        btnMic.classList.remove('active');
        if (recognition) recognition.stop();
    };

    btnMic.onclick = () => {
        if (isAutoMode) { stopRecognition(); } 
        else { isAutoMode = true; startRecognition(); }
    };

    // MSG HANDLER
    const pushMsg = (txt, role, isImg=false) => {
        const row = document.createElement('div');
        row.className = `msg-row row-${role}`;
        const bub = document.createElement('div');
        bub.className = `bubble bub-${role}`;
        
        if(isImg) {
            bub.innerHTML = `Generated Image:<br><img src='data:image/jpeg;base64,${txt}' onclick="document.getElementById('view-full-img').src=this.src;document.getElementById('view-modal').style.display='flex'">`;
        } else {
            // Simple Parse
            bub.innerHTML = (window.marked) ? window.marked.parse(txt) : txt;
        }
        
        row.appendChild(bub);
        chatZone.appendChild(row);
        
        if (role === 'user') scrollDown();
        else row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        return row; 
    };

    const runCmd = async (cmd, voiceMode) => {
        pushMsg(cmd, 'user');
        inpField.value = '';
        const loadRow = pushMsg("Thinking...", 'bot');
        try {
            const req = await fetch('/execute_command', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ command: cmd, is_voice: voiceMode })
            });
            loadRow.remove();
            const res = await req.json();
            if (res.is_image) {
                pushMsg(res.image_data, 'bot', true);
                if(isAutoMode) startRecognition();
            } else {
                pushMsg(res.response, 'bot');
            }
            if (res.audio_data) playAudio(res.audio_data);
            else if (isAutoMode) startRecognition();
        } catch (e) {
            loadRow.remove();
            pushMsg("Connection error.", 'bot');
            if (isAutoMode) stopRecognition(); 
        }
    };
});
> Start of message (Taaki user upar se padh sake)
        if (role === 'user') {
            scrollDown();
        } else {
            row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        return row; 
    };

    const runCmd = async (cmd, voiceMode) => {
        pushMsg(cmd, 'user');
        inpField.value = '';
        btnSend.classList.remove('ready');
        if (recognition) recognition.stop(); 

        const loadRow = pushMsg("Thinking...", 'bot');

        try {
            const req = await fetch('/execute_command', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ command: cmd, is_voice: voiceMode })
            });
            
            loadRow.remove();
            const res = await req.json();
            
            if (res.is_image) {
                pushMsg(res.image_data, 'bot', true);
                if(isAutoMode) startRecognition();
            } else {
                pushMsg(res.response, 'bot');
            }

            if (res.audio_data) playAudio(res.audio_data);
            else if (isAutoMode) startRecognition();

        } catch (e) {
            loadRow.remove();
            pushMsg("Connection error.", 'bot');
            if (isAutoMode) stopRecognition(); 
        }
    };
});
        
