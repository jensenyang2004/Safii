#!/usr/bin/env python
from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

# --- Basic Configuration ---
logging.basicConfig(level=logging.INFO)
load_dotenv() # Load environment variables from .env file

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Gemini API Setup ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables or .env file.")

# Initialize the client using http_options as per the documentation
client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})

# --- Model Configuration ---
# Note: The model used for the token must match the model used by the client
MODEL = "gemini-2.0-flash-live-001"

@app.route('/session', methods=['GET'])
def create_session_token():
    """Creates and returns a short-lived auth token for the Gemini Live API."""
    try:
        # Define token constraints, combining info from both examples
        expire_time = datetime.now(timezone.utc) + timedelta(hours=1)

        token_config = {
            "uses": 10,
            "expire_time": expire_time.isoformat(),
            "new_session_expire_time": expire_time.isoformat(),
            "live_connect_constraints": {
                "model": MODEL,
                "config": {
                    "response_modalities": [types.Modality.AUDIO],
                    "system_instruction": "You are a friendly woman calling your friend, who is an office worker that loves badminton. You are already at 'The Local Cafe' waiting for her. Start the conversation by greeting her and asking for her ETA.",
                }
            }
        }

        # The method is auth_tokens.create
        token_response = client.auth_tokens.create(config=token_config)

        # Per the documentation, the value to use is in the .name attribute
        return jsonify({"token": token_response.name})

    except Exception as e:
        logging.error(f"Error creating session token: {e}")
        return jsonify({"error": "Failed to create session token"}), 500

if __name__ == "__main__":
    logging.info("Starting Flask server on 0.0.0.0:5010")
    app.run(host="0.0.0.0", port=5010)