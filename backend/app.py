from flask import Flask, request, jsonify, send_from_directory
import whisper
from TTS.api import TTS
import soundfile as sf
import os
import requests

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = '.'
app.config['STATIC_FOLDER'] = 'static'

# Load models once
whisper_model = whisper.load_model("small")
tts_model = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC")

# --- Route: Transcribe user audio ---
@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    audio = request.files["audio"]
    audio.save("input.wav")
    result = whisper_model.transcribe("input.wav")
    return jsonify({"text": result["text"]})

# --- Route: Generate LLM reply (via Ollama) ---
@app.route("/chat", methods=["POST"])
def chat():
    prompt = request.json["prompt"]
    # history = request.json.get("history", [])

    # Call Ollama server
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "llama2", "prompt": prompt, "stream": False}
    )
    reply = response.json().get("response", "").strip()
    return jsonify({"reply": reply})

# --- Route: Convert reply to speech with Coqui ---
@app.route("/speak", methods=["POST"])
def synthesize():
    text = request.json["text"]
    output_path = os.path.join(app.config['STATIC_FOLDER'], "output.wav")
    tts_model.tts_to_file(text=text, file_path=output_path)
    return jsonify({"audio_url": "http://<your-ip>:5000/static/output.wav"})

# --- Serve static TTS audio ---
@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory(app.config['STATIC_FOLDER'], filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)