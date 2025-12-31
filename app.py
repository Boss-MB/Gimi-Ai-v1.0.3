"""
Project: Gimi AI
Author: Mohammad Basan
Description: Production-ready AI Assistant with Smart Routing & Context Awareness.
"""

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

# Load local environment variables (Render will skip this)
load_dotenv()

# Setup Flask Application
# We use 'Frontend' as both template and static folder for simplicity
app = Flask(__name__, template_folder='Frontend', static_folder='Frontend')
CORS(app)

# --- CONFIGURATION ---

# API Key Rotation Strategy
gemini_keys = [os.getenv("GEMINI_API_KEY_1"), os.getenv("GEMINI_API_KEY_2")]
current_gemini_index = 0

# Voice Configuration
# 'AndrewMultilingual' handles Hindi/English mix very naturally
VOICE = "en-US-AndrewMultilingualNeural" 

def configure_genai():
    """Configures Google Gemini API with fallback support."""
    global current_gemini_index
    if current_gemini_index < len(gemini_keys) and gemini_keys[current_gemini_index]:
        genai.configure(api_key=gemini_keys[current_gemini_index])
    else:
        print("CRITICAL WARNING: No Valid API Keys Found!")

configure_genai()

# --- AI MODEL SETUP ---

MODEL_NAME = 'gemini-1.5-flash'

# Advanced System Prompt with Routing Logic
sys_instruction = """You are Gimi AI, created by Mohammad Basan.

CORE PROTOCOLS:
1. RESPONSE STYLE: Be concise, intelligent, and helpful.
2. IDENTITY: If asked "Who created you?", answer "Mohammad Basan".
3. TIME AWARENESS: Use the provided system context to answer time/date queries.
4. IMAGE ROUTING: If the user wants to generate/draw/create an image, DO NOT refuse.
   Instead, output strictly this Trigger Code:
   TRIGGER_IMAGE_GENERATION: <detailed_prompt_for_flux_model>

   Example:
   User: "Ek futuristic car banao"
   You: TRIGGER_IMAGE_GENERATION: A futuristic cyberpunk sports car, neon lights, rainy street, 8k resolution.
"""

model = genai.GenerativeModel(MODEL_NAME, system_instruction=sys_instruction)
chat_session = model.start_chat(history=[])
prompt_model = genai.GenerativeModel(MODEL_NAME) # Helper model for prompt refinement

# --- HELPER FUNCTIONS ---

def get_current_time_str():
    """Get current time in IST (Indian Standard Time)."""
    IST = pytz.timezone('Asia/Kolkata')
    return datetime.datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S %A")

async def get_audio_base64(text):
    """Generates audio in memory and returns Base64 string."""
    text = clean_text_for_speech(text)
    if not text: return None
    
    communicate = edge_tts.Communicate(text, VOICE)
    audio_stream = io.BytesIO()
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_stream.write(chunk["data"])
            
    audio_stream.seek(0)
    return base64.b64encode(audio_stream.read()).decode('utf-8')

def clean_text_for_speech(text):
    """Cleans markdown and system codes from TTS input."""
    text = text.replace('*', '').replace('#', '').replace('_', '')
    if "TRIGGER_IMAGE_GENERATION" in text: return "" # Silence the trigger code
    text = re.sub(r'[^\w\s,!.?]', '', text) 
    return re.sub(' +', ' ', text).strip()

def clean_display_text(text):
    return re.sub(r'(?i)\*?part\s*1\*?:?', '', text).strip()

def extract_text_from_file(file_stream, filename):
    """Extracts text from PDF or TXT files."""
    text = ""
    try:
        if filename.endswith('.pdf'):
            reader = PyPDF2.PdfReader(file_stream)
            max_pages = min(len(reader.pages), 30) 
            for i in range(max_pages): text += reader.pages[i].extract_text() + "\n"
        elif filename.endswith('.txt'):
            text = file_stream.read().decode('utf-8')
        return text
    except Exception as e:
        print(f"File Error: {e}")
        return ""

# --- IMAGE GENERATION ---

def generate_image_pollinations(prompt):
    """Generates image using Pollinations.ai (Flux Model)."""
    try:
        # Step 1: Enhance prompt
        try:
            enhanced = prompt_model.generate_content(f"Refine this for image generation: '{prompt}'").text.strip()
        except:
            enhanced = prompt
            
        # Step 2: Generate URL
        seed = random.randint(1, 100000)
        encoded_prompt = requests.utils.quote(enhanced)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?seed={seed}&width=1024&height=1024&nologo=true&model=flux" 
        
        # Step 3: Fetch and Convert to Base64
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return base64.b64encode(resp.content).decode('utf-8')
        return None
    except Exception as e:
        print(f"Img Gen Failed: {e}")
        return None

# --- APP ROUTES ---

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload_file', methods=['POST'])
def handle_upload():
    if 'file' not in request.files: return jsonify({'error': 'No file'})
    file = request.files['file']
    
    if file:
        content = extract_text_from_file(file.stream, file.filename)
        if content:
            # Inject document into chat history
            chat_session.history.append({
                "role": "user", 
                "parts": [f"[System Memory: User uploaded '{file.filename}'. Content:]\n{content}"]
            })
            chat_session.history.append({
                "role": "model", 
                "parts": ["I have analyzed the document."]
            })
            return jsonify({'success': True, 'message': f"Read {file.filename}."})
            
    return jsonify({'success': False, 'message': "Failed to process file."})

@app.route('/execute_command', methods=['POST'])
def handle_chat():
    data = request.json
    user_input = data.get('command', '')
    is_voice = data.get('is_voice', False)

    # 1. DIRECT IMAGE CHECK (Regex/Keywords)
    triggers = ["generate image", "create image", "draw", "photo of", "tasveer"]
    lower_input = user_input.lower()
    is_direct_image = any(t in lower_input for t in triggers) and "what is" not in lower_input

    if is_direct_image:
        img_data = generate_image_pollinations(user_input)
        if img_data:
            return jsonify({'response': "", 'is_image': True, 'image_data': img_data})

    # 2. GEMINI PROCESSING (With Context Injection)
    try:
        # Hidden Context: Time & Date
        context_msg = f"[System: Current Time {get_current_time_str()}] User: {user_input}"
        
        response = chat_session.send_message(context_msg)
        reply_text = response.text.strip()

        # 3. SMART ROUTER (Did Gemini ask for an image?)
        if "TRIGGER_IMAGE_GENERATION:" in reply_text:
            prompt_part = reply_text.split("TRIGGER_IMAGE_GENERATION:")[1].strip()
            print(f"Router Triggered: {prompt_part}")
            
            img_data = generate_image_pollinations(prompt_part)
            if img_data:
                 return jsonify({'response': "", 'is_image': True, 'image_data': img_data})
            else:
                reply_text = "I tried to generate that image, but the server is busy."

    except Exception as e:
        print(f"Gemini Error: {e}")
        return jsonify({'response': "I'm having trouble connecting to the brain.", 'is_image': False})

    # 4. AUDIO GENERATION
    clean_reply = clean_display_text(reply_text)
    audio_data = None
    
    if is_voice:
        try:
            speech_text = reply_text.replace("TRIGGER_IMAGE_GENERATION", "")
            audio_data = asyncio.run(get_audio_base64(speech_text))
        except: pass

    return jsonify({'response': clean_reply, 'is_image': False, 'audio_data': audio_data})

# Main Entry Point
if __name__ == '__main__':
    # Render provides PORT, default to 5000 locally
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
  
