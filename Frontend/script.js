// Window Load hone ke baad hi code chalega (Safety check)
window.onload = function() {
    console.log("Engine Started.");

    const chatZone = document.getElementById('chat-stream');
    const inpField = document.getElementById('input-msg');
    const btnSend = document.getElementById('action-send');
    const btnMic = document.getElementById('action-mic');
    const btnAttach = document.getElementById('action-attach');
    const hiddenFile = document.getElementById('input-file-hidden');
    const modal = document.getElementById('view-modal');

    let isAutoMode = false;
    let recognition = null;

    // --- WELCOME MESSAGE (Direct Call) ---
    // Koi library nahi chahiye, direct text insert hoga
    setTimeout(() => {
        addMessage("Hello! I am ready.", 'bot');
    }, 500);

    // --- HELPER: Add Message ---
    function addMessage(text, role, isImage) {
        const row = document.createElement('div');
        row.className = 'msg-row row-' + role;
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble bub-' + role;

        if (isImage) {
            bubble.innerHTML = 'Generated Image:<br><img src="data:image/jpeg;base64,' + text + '" onclick="viewImage(this.src)">';
        } else {
            // Simple formatter: Bold aur Newline ko convert karta hai
            let formatted = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            bubble.innerHTML = formatted;
        }

        row.appendChild(bubble);
        chatZone.appendChild(row);
        
        // Scroll Logic
        if(role === 'user') {
            chatZone.scrollTo({ top: chatZone.scrollHeight, behavior: 'smooth' });
        } else {
            row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        return row;
    }

    // --- SEND BUTTON LOGIC ---
    // Direct 'onclick' assign kiya hai taaki koi listener issue na ho
    btnSend.onclick = function() {
        sendMessage();
    };

    // Enter Key Logic
    inpField.onkeydown = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    function sendMessage() {
        const text = inpField.value.trim();
        if (!text) return;

        inpField.value = '';
        
        // Stop Mic if running
        isAutoMode = false;
        if(recognition) try { recognition.stop(); } catch(e){}
        btnMic.style.color = '#888';

        addMessage(text, 'user');
        
        // Backend Call
        const loadingRow = addMessage("Thinking...", 'bot');
        
        fetch('/execute_command', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ command: text, is_voice: false })
        })
        .then(res => res.json())
        .then(data => {
            loadingRow.remove();
            if(data.is_image) {
                addMessage(data.image_data, 'bot', true);
            } else {
                addMessage(data.response, 'bot');
            }
            if(data.audio_data) playAudio(data.audio_data);
        })
        .catch(err => {
            loadingRow.remove();
            addMessage("Error: Check Terminal", 'bot');
        });
    }

    // --- ATTACH BUTTON LOGIC ---
    btnAttach.onclick = function() {
        hiddenFile.click();
    };

    hiddenFile.onchange = function() {
        if (hiddenFile.files.length > 0) {
            const file = hiddenFile.files[0];
            addMessage("Reading " + file.name + "...", 'user');
            
            const formData = new FormData();
            formData.append('file', file);
            
            fetch('/upload_file', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => addMessage(data.message, 'bot'))
            .catch(err => addMessage("Upload Failed", 'bot'));
            
            hiddenFile.value = ''; // Reset
        }
    };

    // --- MIC LOGIC (Simplified) ---
    btnMic.onclick = function() {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Mic not supported in this browser.");
            return;
        }

        if (isAutoMode) {
            // STOP
            isAutoMode = false;
            if (recognition) recognition.stop();
            btnMic.style.color = '#888';
        } else {
            // START
            isAutoMode = true;
            recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-IN';
            recognition.interimResults = false;

            recognition.onstart = function() {
                btnMic.style.color = '#ff4757';
            };
            
            recognition.onend = function() {
                if(!isAutoMode) btnMic.style.color = '#888';
            };

            recognition.onresult = function(event) {
                const transcript = event.results[event.results.length - 1][0].transcript;
                inpField.value = transcript;
                sendMessage(); // Auto send on speak
            };

            recognition.start();
        }
    };

    // --- AUDIO PLAYER ---
    function playAudio(base64Audio) {
        if (!base64Audio) return;
        const audio = new Audio("data:audio/mp3;base64," + base64Audio);
        audio.play().catch(e => console.log("Audio play error", e));
    }

    // --- MODAL IMAGE VIEW ---
    window.viewImage = function(src) {
        document.getElementById('view-full-img').src = src;
        modal.style.display = 'flex';
    };
    
    modal.onclick = function() {
        modal.style.display = 'none';
    };
};

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
        
