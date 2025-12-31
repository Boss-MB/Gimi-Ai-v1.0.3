document.addEventListener('DOMContentLoaded', () => {
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

    // --- SAFE MARKDOWN PARSER ---
    // Agar internet nahi hai aur marked load nahi hua to crash nahi hoga
    const parseMarkdown = (text) => {
        try {
            if (typeof marked !== 'undefined') {
                return marked.parse(text);
            } else {
                return text; 
            }
        } catch (e) {
            console.error("Markdown Error:", e);
            return text;
        }
    };

    // Welcome Message
    setTimeout(() => pushMsg("Hello! I am ready.", 'bot'), 500);

    // Basic Scroll Function (Bottom ke liye)
    const scrollDown = () => chatZone.scrollTo({ top: chatZone.scrollHeight, behavior: 'smooth' });
    
    // Modal Close
    if(modal) {
        window.closeModal = () => modal.style.display = 'none';
        modal.onclick = () => modal.style.display = 'none';
    }

    // Audio Playback
    const playAudio = (b64) => {
        if (!b64) {
            if (isAutoMode) startRecognition();
            return;
        }
        const audio = new Audio("data:audio/mp3;base64," + b64);
        audio.play().catch(e => console.warn("Audio blocked:", e));
        audio.onended = () => {
            if (isAutoMode) startRecognition();
        };
    };

    // Input Handling
    inpField.addEventListener('input', () => {
        if(inpField.value.trim()) btnSend.classList.add('ready');
        else btnSend.classList.remove('ready');
    });

    const triggerSend = () => {
        const txt = inpField.value.trim();
        if(txt) {
            isAutoMode = false;
            if(btnMic) btnMic.classList.remove('active');
            stopRecognition();
            runCmd(txt, false);
        }
    };

    if(btnSend) {
        btnSend.addEventListener('click', triggerSend);
    }
    
    if(inpField) {
        inpField.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                triggerSend(); 
            }
        });
    }

    // File Attachment Logic
    if(btnAttach && hiddenFile) {
        btnAttach.addEventListener('click', () => hiddenFile.click());
        hiddenFile.addEventListener('change', async () => {
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
        });
    }

    // MIC LOGIC
    const startRecognition = () => {
        if (!window.webkitSpeechRecognition) return alert("Mic not supported.");
        if (recognition && recognition.started) return;

        recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-IN'; 
        recognition.interimResults = false;
        recognition.started = true;

        recognition.onstart = () => { if(btnMic) btnMic.classList.add('active'); };
        recognition.onend = () => { recognition.started = false; };
        recognition.onresult = (e) => {
            const t = e.results[e.results.length-1][0].transcript;
            inpField.value = t;
            btnSend.classList.add('ready');
            runCmd(t, true); 
        };
        try { recognition.start(); } catch(e) { console.log(e); }
    };

    const stopRecognition = () => {
        isAutoMode = false;
        if(btnMic) btnMic.classList.remove('active');
        if (recognition) recognition.stop();
    };

    if(btnMic) {
        btnMic.addEventListener('click', () => {
            if (isAutoMode) { stopRecognition(); } 
            else { isAutoMode = true; startRecognition(); }
        });
    }

    // --- MAIN MESSAGE FUNCTION (UPDATED) ---
    const pushMsg = (txt, role, isImg=false) => {
        const row = document.createElement('div');
        row.className = `msg-row row-${role}`;
        const bub = document.createElement('div');
        bub.className = `bubble bub-${role}`;
        
        if(isImg) {
            bub.innerHTML = `Generated Image:<br><img src='data:image/jpeg;base64,${txt}' onclick="document.getElementById('view-full-img').src=this.src;document.getElementById('view-modal').style.display='flex'">`;
        } else {
            bub.innerHTML = parseMarkdown(txt);
        }
        
        row.appendChild(bub);
        chatZone.appendChild(row);
        
        // --- SMART SCROLL LOGIC ---
        // User ka msg -> Bottom scroll
        // Bot ka msg -> Start of message (Taaki user upar se padh sake)
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
        
