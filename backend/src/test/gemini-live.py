import asyncio
from google import genai
from google.genai import types
import os
import pyaudio
from dotenv import load_dotenv
import base64
import wave

load_dotenv()  # take environment variables from .env.

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables or .env file.")

client = genai.Client(api_key=api_key)

# Select the model designed for live, audio-based interactions.
MODEL = "gemini-2.5-flash-preview-native-audio-dialog"

# PyAudio setup
# These values match the output format from the Gemini Live API.
RATE = 24000  # Sample rate in Hz
CHANNELS = 1  # Number of audio channels (mono)
FORMAT = pyaudio.paInt16  # 16-bit signed integers

p = pyaudio.PyAudio()


# Open a wav file for debugging
wf = wave.open("gemini_debug_output.wav", "wb")
wf.setnchannels(CHANNELS)
wf.setsampwidth(p.get_sample_size(FORMAT))
wf.setframerate(RATE)

# for i in range(p.get_device_count()):
#     info = p.get_device_info_by_index(i)
#     print(i, info.get("name"), info.get("maxOutputChannels"))

async def live_conversation_session():
    """
    Establishes a live session with Gemini and handles a simple conversation.
    """
    print("Starting a live conversation session...")

    config = {
        "response_modalities": ["AUDIO"]
    }

    # Open a PyAudio stream to play the audio.
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    output=True,
                    output_device_index=0)

    try:
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            print("Connected! You can now send messages.")
            print("Type 'q' or 'quit' to end the session.")

            while True:
                user_input = await asyncio.to_thread(input, "You: ")
                
                if user_input.lower() in ["q", "quit"]:
                    print("Ending session.")
                    break

                # Send the user message
                await session.send_client_content(
                    turns=[{"role": "user", "parts": [{"text": user_input}]}],
                    turn_complete=True
                )

                print("Gemini:", end=" ", flush=True)

                # Receive and process the response from Gemini
                async for response in session.receive():
                    # print(f"Debug - Response: {response.dict()}")
                    
                    # Handle text response
                    if hasattr(response, 'text') and response.text is not None:
                        print(response.text, end="", flush=True)
                    
                    # Handle server content (this is where audio usually comes from)
                    if hasattr(response, 'server_content') and response.server_content:
                        if hasattr(response.server_content, 'model_turn') and response.server_content.model_turn:
                            for part in response.server_content.model_turn.parts:
                                # Handle text parts
                                if hasattr(part, 'text') and part.text:
                                    print(part.text, end="", flush=True)

                                # Handle inline data (audio)
                                if hasattr(part, 'inline_data') and part.inline_data and hasattr(part.inline_data, 'data'):
                                    # The mime_type check was removed as it was null in the debug output.
                                    # We assume any inline_data is the audio we requested.
                                    audio_data = part.inline_data.data
                                    if isinstance(audio_data, str):
                                        audio_data = base64.b64decode(audio_data)
                                    
                                    if isinstance(audio_data, bytes):
                                        stream.write(audio_data)
                                        wf.writeframes(audio_data)
                                        print("[Audio played]", end="", flush=True)
                    
                    # Alternative: check for data attribute directly
                    if hasattr(response, 'data') and response.data is not None:
                        # print(f"Debug - Data type: {type(response.data)}")
                        # print(f"Debug - Data attributes: {dir(response.data)}")
                        
                        # Try different ways to access audio data
                        if hasattr(response.data, 'audio'):
                            if hasattr(response.data.audio, 'raw'):
                                stream.write(response.data.audio.raw)
                                wf.writeframes(response.data.audio.raw)
                                print("[Audio played via raw]", end="", flush=True)
                        elif hasattr(response.data, 'raw'):
                            stream.write(response.data.raw)
                            wf.writeframes(response.data.raw)
                            print("[Audio played via data.raw]", end="", flush=True)

                print()  # Newline for next turn

    except Exception as e:
        print(f"Error in live conversation: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Stop and close the PyAudio stream and terminate PyAudio instance.
        stream.stop_stream()
        stream.close()
        p.terminate()
        wf.close()

if __name__ == "__main__":
    asyncio.run(live_conversation_session())