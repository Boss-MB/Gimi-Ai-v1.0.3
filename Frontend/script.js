/**
 * Gimi AI Frontend Logic
 * Handles Chat, Mic, File Uploads, and Image Modals
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("System Online.");

    // Select Elements
    const chatZone = document.getElementById('chat-stream');
    const inpField = document.getElementById('input-msg');
    const btnSend = document.getElementById('action-send');
    const btnMic = document.getElementById('action-mic');
    const btnAttach = document.getElementById('action-attach');
    const hiddenFile = document.getElementById('input-file-hidden');
    const modal = document.getElementById('view-modal');
    const modalImg = document.getElementById('view-full-img');

    let recognition;
    let isListening = false;

    // Initial Greeting
    setTimeout(() => pushMsg("Hello! I am Gimi AI.", 'bot'), 500);

    // --- UTILITIES ---
    const scrollDown = () => chatZone.scrollTo({ top: chatZone.scrollHeight, behavior: 'smooth' });
    
    window.closeModal = () => modal.style.display = 'none';
    modal.onclick = () => modal.style.display = 'none';

    const playAudio = (b64) => {
        if (!b64) return;
        new Audio("data:audio/mp3;base64," + b64).play().catch(e => console.warn("Audio blocked:", e));
    };

    // --- EVENT LISTENERS ---

    // 1. Typing Check
    inpField.addEventListener('input', () => {
        if(inpField.value.trim()) btnSend.classList.add('ready');
        else btnSend.classList.remove('ready');
    });

    // 2. Send Message
    const triggerSend = () => {
        const txt = inpField.value.trim();
        if(txt) runCmd(txt, false);
    };

    btnSend.addEventListener('click', triggerSend);
    
    inpField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            triggerSend();
        }
    });

    // 3. File Upload
    btnAttach.addEventListener('click', () => hiddenFile.click());

    hiddenFile.addEventListener('change', async () => {
        if (!hiddenFile.files[0]) return;
        
        const fd = new FormData();
        fd.append('file', hiddenFile.files[0]);
        pushMsg(`Uploading ${hiddenFile.files[0].name}...`, 'user');
        
        try {
            const r = await fetch('/upload_file', { method: 'POST', body: fd });
            const d = await r.json();
            pushMsg(d.message, 'bot');
        } catch (e) { pushMsg("Upload failed.", 'bot'); }
        hiddenFile.value = ''; 
    });

    // 4. Microphone Logic
    btnMic.addEventListener('click', () => {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            return alert("Microphone requires HTTPS.");
        }
        if (!window.webkitSpeechRecognition) return alert("Browser not supported.");

        if (isListening) {
            if(recognition) recognition.stop();
        } else {
            recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-IN';
            
            recognition.onstart = () => { isListening=true; btnMic.classList.add('active'); };
            recognition.onend = () => { isListening=false; btnMic.classList.remove('active'); };
            recognition.onresult = (e) => {
                const t = e.results[e.results.length-1][0].transcript;
                inpField.value = t;
                runCmd(t, true);
            };
            recognition.start();
        }
    });

    // --- CORE LOGIC ---
    const pushMsg = (txt, role, isImg=false) => {
        const row = document.createElement('div');
        row.className = `msg-row row-${role}`;
        
        const bub = document.createElement('div');
        bub.className = `bubble bub-${role}`;
        
        if(isImg) {
            bub.innerHTML = `Generated Image:<br><img src='data:image/jpeg;base64,${txt}' onclick="document.getElementById('view-full-img').src=this.src;document.getElementById('view-modal').style.display='flex'">`;
        } else {
            bub.innerHTML = marked.parse(txt);
        }
        
        row.appendChild(bub);
        chatZone.appendChild(row);
        scrollDown();
        return row; 
    };

    const runCmd = async (cmd, voiceMode) => {
        pushMsg(cmd, 'user');
        inpField.value = '';
        btnSend.classList.remove('ready');

        const loadRow = pushMsg("Thinking...", 'bot');

        try {
            const req = await fetch('/execute_command', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ command: cmd, is_voice: voiceMode })
            });
            
            loadRow.remove();
            
            const res = await req.json();
            
            if (res.is_image) pushMsg(res.image_data, 'bot', true);
            else pushMsg(res.response, 'bot');

            if (res.audio_data) playAudio(res.audio_data);

        } catch (e) {
            loadRow.remove();
            pushMsg("Server connection error.", 'bot');
        }
    };
});
      
