import os
import asyncio
import edge_tts
import re
import requests 
import random
import time
import base64 
import PyPDF2
import io
import datetime
import pytz 
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, template_folder='Frontend', static_folder='Frontend')
CORS(app)

# --- CONFIG ---
gemini_keys = [os.getenv("GEMINI_API_KEY_1"), os.getenv("GEMINI_API_KEY_2")]
current_gemini_index = 0
VOICE = "en-US-AndrewMultilingualNeural" 

def configure_genai():
    global current_gemini_index
    if current_gemini_index < len(gemini_keys) and gemini_keys[current_gemini_index]:
        genai.configure(api_key=gemini_keys[current_gemini_index])
configure_genai()

# --- SYSTEM PROMPT (Markdown & Summary) ---
MODEL_NAME = 'gemini-2.5-flash-lite'

sys_instruction = """You are Gimi AI.

RULES:
1. FORMATTING: Use Markdown. Use **Bold**, *Lists*, and ### Headings. Avoid wall of text.
2. VOICE OUTPUT: You must provide a separate, shorter summary for speech.
   Separate the visible text and the spoken text using "|||".
   
   Structure:
   [Detailed Formatted Text for Screen]
   |||
   [Short Conversational Summary for Voice]

3. IMAGE LOGIC: If user wants an image, output EXACTLY:
   TRIGGER_IMAGE_GENERATION: <detailed_prompt>
"""

model = genai.GenerativeModel(MODEL_NAME, system_instruction=sys_instruction)
chat_session = model.start_chat(history=[])

# --- HELPERS ---
def get_current_time_str():
    IST = pytz.timezone('Asia/Kolkata')
    return datetime.datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S %A")

async def get_audio_base64(text):
    text = clean_text_for_speech(text)
    if not text: return None
    communicate = edge_tts.Communicate(text, VOICE)
    audio_stream = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio": audio_stream.write(chunk["data"])
    audio_stream.seek(0)
    return base64.b64encode(audio_stream.read()).decode('utf-8')

def clean_text_for_speech(text):
    text = text.replace('*', '').replace('#', '').replace('_', '')
    if "TRIGGER_IMAGE_GENERATION" in text: return ""
    return re.sub(r'[^\w\s,!.?]', '', text).strip()

def extract_text_from_file(file_stream, filename):
    text = ""
    try:
        if filename.endswith('.pdf'):
            reader = PyPDF2.PdfReader(file_stream)
            max_pages = min(len(reader.pages), 30) 
            for i in range(max_pages): text += reader.pages[i].extract_text() + "\n"
        elif filename.endswith('.txt'): text = file_stream.read().decode('utf-8')
        return text
    except: return ""

def generate_image_pollinations(prompt):
    try:
        seed = random.randint(1, 100000)
        encoded_prompt = requests.utils.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?seed={seed}&width=1024&height=1024&nologo=true&model=flux" 
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return base64.b64encode(resp.content).decode('utf-8')
        return None
    except: return None

# --- ROUTES ---
@app.route('/')
def home(): return render_template('index.html')

@app.route('/upload_file', methods=['POST'])
def handle_upload():
    if 'file' not in request.files: return jsonify({'error': 'No file'})
    file = request.files['file']
    if file:
        content = extract_text_from_file(file.stream, file.filename)
        if content:
            chat_session.history.append({"role": "user", "parts": [f"File: {file.filename}\n{content}"]})
            chat_session.history.append({"role": "model", "parts": ["File memorized."]})
            return jsonify({'success': True, 'message': f"Read {file.filename}."})
    return jsonify({'success': False, 'message': "Failed."})

@app.route('/execute_command', methods=['POST'])
def handle_chat():
    data = request.json
    user_input = data.get('command', '')
    is_voice = data.get('is_voice', False)

    # 1. DIRECT IMAGE CHECK
    triggers = ["generate image", "create image", "draw", "photo of", "tasveer"]
    lower_input = user_input.lower()
    is_direct_image = any(t in lower_input for t in triggers) and "what is" not in lower_input

    if is_direct_image:
        img_data = generate_image_pollinations(user_input)
        if img_data:
            return jsonify({'response': "", 'is_image': True, 'image_data': img_data})

    # 2. GEMINI CHAT
    try:
        context_msg = f"[Time: {get_current_time_str()}] User: {user_input}"
        response = chat_session.send_message(context_msg)
        full_response = response.text.strip()

        # 3. ROUTER CHECK
        if "TRIGGER_IMAGE_GENERATION:" in full_response:
            prompt_part = full_response.split("TRIGGER_IMAGE_GENERATION:")[1].strip()
            img_data = generate_image_pollinations(prompt_part)
            if img_data:
                 return jsonify({'response': "", 'is_image': True, 'image_data': img_data})
            else:
                full_response = "Image generation server is busy."

    except Exception as e:
        print(e)
        return jsonify({'response': "Connection error.", 'is_image': False})

    # 4. SPLIT TEXT & AUDIO
    display_text = full_response
    speech_text = full_response

    if "|||" in full_response:
        parts = full_response.split("|||")
        display_text = parts[0].strip()
        speech_text = parts[1].strip()
    
    audio_data = None
    if is_voice:
        try:
            audio_data = asyncio.run(get_audio_base64(speech_text))
        except: pass

    return jsonify({'response': display_text, 'is_image': False, 'audio_data': audio_data})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
