document.addEventListener('DOMContentLoaded', () => {
    console.log("Simple JS Loaded.");

    const chatZone = document.getElementById('chat-stream');
    const inpField = document.getElementById('input-msg');
    const btnSend = document.getElementById('action-send');
    const btnMic = document.getElementById('action-mic');
    const btnAttach = document.getElementById('action-attach');
    const hiddenFile = document.getElementById('input-file-hidden');
    const modal = document.getElementById('view-modal');

    let recognition;
    let isAutoMode = false;

    // Simple Formatter (Jugad for formatting)
    const formatText = (text) => {
        if(!text) return "";
        // Replace newlines with break tags and bold text
        return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    };

    setTimeout(() => pushMsg("Hello! Ready.", 'bot'), 500);

    const scrollDown = () => {
        if(chatZone) chatZone.scrollTo({ top: chatZone.scrollHeight, behavior: 'smooth' });
    };

    if(modal) {
        window.closeModal = () => modal.style.display = 'none';
        modal.onclick = () => modal.style.display = 'none';
    }

    // MAIN SEND FUNCTION
    const triggerSend = () => {
        const txt = inpField.value.trim();
        if(!txt) return;

        // Reset everything
        isAutoMode = false;
        if(btnMic) btnMic.style.color = '#888';
        if(recognition) recognition.stop();
        
        runCmd(txt, false);
        inpField.value = '';
    };

    // Events Attach Karo Simple Tareeke Se
    if(btnSend) {
        btnSend.onclick = triggerSend; // Direct click
    }

    if(inpField) {
        inpField.onkeydown = (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); triggerSend(); }
        };
    }

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

    // Mic Logic (Simple)
    if(btnMic) {
        btnMic.onclick = () => {
            if(!window.webkitSpeechRecognition) return alert("No Mic Support");
            
            if(isAutoMode) {
                // Stop
                isAutoMode = false;
                if(recognition) recognition.stop();
                btnMic.style.color = '#888';
            } else {
                // Start
                isAutoMode = true;
                recognition = new webkitSpeechRecognition();
                recognition.lang = 'en-IN';
                recognition.interimResults = false;
                
                recognition.onstart = () => { btnMic.style.color = '#ff4757'; };
                recognition.onend = () => { 
                    if(!isAutoMode) btnMic.style.color = '#888'; 
                };
                recognition.onresult = (e) => {
                    const t = e.results[e.results.length-1][0].transcript;
                    inpField.value = t;
                    runCmd(t, true);
                };
                try { recognition.start(); } catch(e) {}
            }
        };
    }

    // Audio Player
    const playAudio = (b64) => {
        if (!b64) { if (isAutoMode) startRecognition(); return; }
        const audio = new Audio("data:audio/mp3;base64," + b64);
        audio.play().catch(e => {});
        audio.onended = () => { 
            // Restart mic if auto mode is on
            if(isAutoMode && recognition) {
                try { recognition.start(); } catch(e){}
            }
        };
    };

    // Display Message
    const pushMsg = (txt, role, isImg=false) => {
        const row = document.createElement('div');
        row.className = `msg-row row-${role}`;
        const bub = document.createElement('div');
        bub.className = `bubble bub-${role}`;
        
        if(isImg) {
            bub.innerHTML = `Generated Image:<br><img src='data:image/jpeg;base64,${txt}' onclick="document.getElementById('view-full-img').src=this.src;document.getElementById('view-modal').style.display='flex'">`;
        } else {
            bub.innerHTML = formatText(txt);
        }
        
        row.appendChild(bub);
        chatZone.appendChild(row);
        
        if (role === 'user') scrollDown();
        else row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        return row; 
    };

    // Backend Call
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
            } else {
                pushMsg(res.response, 'bot');
            }

            if (res.audio_data) playAudio(res.audio_data);

        } catch (e) {
            loadRow.remove();
            pushMsg("Connection Error.", 'bot');
        }
    };
});
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
        
