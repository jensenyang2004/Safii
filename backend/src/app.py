from flask import Flask, jsonify, request, abort
from flask_cors import CORS
from flask_sock import Sock
import os
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import requests
import json

from .firebase import add_successful_call_log, check_user_and_rate_limit

# --- Basic Configuration ---
logging.basicConfig(level=logging.INFO)
load_dotenv() # Load environment variables from .env file

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app) # Enable CORS for all routes
sock = Sock(app) # Initialize flask-sock

# --- Gemini API Setup ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables or .env file.")

# Initialize the client using http_options as per the documentation
client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})

# --- Model Configuration ---
# Note: The model used for the token must match the model used by the client
MODEL = "gemini-2.0-flash-live-001"

# --- Security ---
# The backend API key must be set as an environment variable
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")
if not BACKEND_API_KEY:
    raise ValueError("BACKEND_API_KEY not found in environment variables.")


@app.route('/openai_session', methods=['GET'])
def openai_session():

    UID = request.headers.get("USERID")
    if not UID or UID == 'Frontend error':
        logging.warning("Forbidden attempt to access /session without authentication.")
        return jsonify({"error": "Forbidden"}), 403
    
    # 1. Auth and Rate Limit Check
    auth_check = check_user_and_rate_limit(UID, limit=50)
    if auth_check["status"] == "error":
        return jsonify({"error": auth_check["message"]}), auth_check["code"]

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    print

    session_config = {
        "session": {
            "type": "realtime",
            "model": "gpt-realtime",
            "audio": {
                "output": {"voice": "marin"},
                "input": {
                    "format": {
                        "type": "audio/pcm",
                        "rate": 24000,
                    },
                    "turn_detection": {
                        "type": "semantic_vad"
                    }
                },
            },
        }
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        # Make the API call to OpenAI to get the token
        response = requests.post(
            "https://api.openai.com/v1/realtime/client_secrets",
            headers=headers,
            data=json.dumps(session_config)
        )


        # Check for successful response
        if response.status_code == 200:
            data = response.json()
            # The token is in the 'value' field
            client_secret = data.get("value") 
            
            if client_secret:
                # Log the successful call
                add_successful_call_log(UID)
                # Send the token back to the frontend
                return jsonify({"client_secret": client_secret})
            else:
                # Handle case where 'value' is missing in a 200 response
                app.logger.error("Failed to parse client_secret from response.")
                abort(500, "Token generation failed (parsing error).")

        else:
            # Handle API errors (e.g., 401 Unauthorized, 400 Bad Request)
            app.logger.error(f"OpenAI API error: {response.status_code} {response.text}")
            abort(response.status_code, "Failed to get token from provider.")

    except requests.exceptions.RequestException as e:
        # Handle network or connection errors
        app.logger.error(f"Request exception: {e}")
        abort(503, "Service unavailable (connection error).")

@app.route('/session', methods=['GET'])
def create_session_token():
    """Creates and returns a short-lived auth token for the Gemini Live API."""
    # --- API Key Authentication ---
    request_api_key = request.headers.get("X-API-Key")
    if not request_api_key or request_api_key != BACKEND_API_KEY:
        logging.warning("Forbidden attempt to access /session without a valid API key.")
        return jsonify({"error": "Forbidden"}), 403

    try:
        # Define token constraints, combining info from both examples
        expire_time = datetime.now(timezone.utc) + timedelta(hours=1)

        token_config = {
            "uses": 20,
            "expire_time": expire_time.isoformat(),
            "new_session_expire_time": expire_time.isoformat(),
            "live_connect_constraints": {
                "model": MODEL,
                "config": {
                    "response_modalities": [types.Modality.AUDIO],
                    "speech_config": {
                        "language_code": "cmn-CN",
                        "voice_config": {"prebuilt_voice_config": {"voice_name": "Kore"}}
                    },
                    "system_instruction": "你是一個f1車隊中的pit stop工作人員，你現在要跟車手確認賽車的狀況以及決定要不要停。",
                }
            }
        }

        # The method is auth_tokens.create
        token_response = client.auth_tokens.create(config=token_config)

        # Pass both the token and the config to the frontend
        return jsonify({
            "token": token_response.name,
            "config": token_config["live_connect_constraints"]["config"]
        })

    except Exception as e:
        logging.error(f"Error creating session token: {e}")
        return jsonify({"error": "Failed to create session token"}), 500

@sock.route('/ws/audio')
def echo_audio(ws):
    logging.info("WebSocket connection established.")
    while True:
        try:
            data = ws.receive()
            if data:
                logging.info("Received audio chunk, echoing back.")
                ws.send(data)
        except Exception as e:
            logging.error(f"WebSocket Error: {e}")
            break
    logging.info("WebSocket connection closed.")


if __name__ == "__main__":
    logging.info("Starting Flask server on 0.0.0.0:8000")
    app.run(host="0.0.0.0", port=8000, debug=True)