# 🤖 Gimi AI: Advanced Conversational Assistant

**Gimi AI** is a powerful, production-ready AI assistant built with Python (Flask) and Google Gemini 1.5 Flash. It goes beyond simple text generation by integrating **Smart Image Routing**, **Document Analysis**, and **Human-like Voice Interaction**.

Designed with a **Mobile-First Dark UI**, it offers a seamless experience hosted on the cloud.

---

### ✨ Key Features

* **🧠 Smart Context & Routing:**
    * **Implicit Image Generation:** If the context implies an image (e.g., "Draw a cat"), Gimi detects it and routes the request to the Flux Image Model automatically.
    * **Time Awareness:** Gimi knows the current real-world Date & Time.

* **🎨 Image Generation (Flux Model):**
    * Generates high-quality images instantly.
    * Click on any generated image to view it in **Full Screen**.

* **📄 Document Memory:**
    * Upload **PDFs** or **TXT** files. Gimi reads, memorizes, and lets you chat about the document content.

* **🗣️ Multilingual Voice (TTS):**
    * Powered by `Edge-TTS` (Andrew Multilingual Neural).
    * Speaks **Hindi, English, and Gujarati** mix naturally.

* **📱 Modern UI/UX:**
    * **AMOLED Dark Mode:** Pitch black theme.
    * **Smooth Animations:** iOS-style message bubbles.
    * **Enter-to-Send:** Desktop-like typing experience on mobile.

---

### 📂 Project Structure

```text
Gimi-AI/
├── app.py                # Main Flask Backend (The Brain)
├── requirements.txt      # Dependencies for Render
├── .gitignore            # Security rules
└── Frontend/             # Static Assets
    ├── index.html        # Main Interface
    ├── style.css         # Dark UI Styling
    ├── script.js         # Frontend Logic
    └── logo.jpg          # Brand Logo
```

---

markdown
### ☁️ How to Deploy on Render (Free)

Gimi AI is optimized for cloud deployment.

1.  Push this code to **GitHub**.
2.  Go to [Render.com](https://render.com) and create a **New Web Service**.
3.  Connect your GitHub repository.
4.  Use the following settings:
    * **Build Command:** `pip install -r requirements.txt`
    * **Start Command:** `gunicorn app:app`
5.  **Environment Variables:**
    Go to the "Environment" tab in Render and add your keys:
    * Key: `GEMINI_API_KEY_1` | Value: `YOUR_GEMINI_API_KEY`
    * Key: `GEMINI_API_KEY_2` | Value: `YOUR_BACKUP_KEY`

Your AI will be live at `https://your-app-name.onrender.com` 🚀

---

### 🛠️ Tech Stack

* **Backend:** Python, Flask, Gunicorn
* **AI Model:** Google Gemini 1.5 Flash
* **Image Gen:** Pollinations AI (Flux Model)
* **Voice:** Microsoft Edge TTS
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)

---

### 👤 Author

Created by **Mohammad Basan**.

---
*Note: This project is for educational purposes.*
