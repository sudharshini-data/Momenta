from flask import Flask, request, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── YOUR CREDENTIALS ─────────────────────────────────────────────────────────
MERALION_API_KEY = "VcWL2Y7ZztQEsEzWUChzdW3lM1Irkmu48G8qMWwh"
MERALION_BASE = "https://api.cr8lab.com"
MERALION_HEADERS = {"x-api-key": MERALION_API_KEY, "Content-Type": "application/json"}

CLOUDFLARE_ACCOUNT_ID = "83b1a003a6ee831325631965262b7aa3"
CLOUDFLARE_API_TOKEN  = "9dyhb-BChjZEc9sv2vlkEuMYUsJqdXAZSr2HRmJA"
SEALION_URL = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/aisingapore/gemma-sea-lion-v4-27b-it"
SEALION_HEADERS = {"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}", "Content-Type": "application/json"}

# ─── SEA-LION CHAT ─────────────────────────────────────────────────────────────
@app.route("/sealion-chat", methods=["POST"])
def sealion_chat():
    data = request.json
    messages = data.get("messages", [])
    system   = data.get("system", "")

    # Only send last 4 messages to avoid token limits
    trimmed = messages[-4:] if len(messages) > 4 else messages

    all_messages = [{"role": "system", "content": system}] + trimmed

    payload = {
        "messages": all_messages,
        "max_tokens": 256,
        "temperature": 0.7
    }
    print(f"Sending {len(all_messages)} messages to SEA-LION...")
    res = requests.post(SEALION_URL, json=payload, headers=SEALION_HEADERS)
    result = res.json()
    print(f"SEA-LION response status: {res.status_code}")

    if not result.get("success"):
        print(f"SEA-LION error: {result.get('errors')}")
        return jsonify({"text": f"SEA-LION error: {result.get('errors')}"}), 500

    text = result.get("result", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
    if not text:
        print(f"Empty response from SEA-LION: {result}")
        return jsonify({"text": "Sorry, I did not catch that. Could you say that again?"}), 200

    print(f"SEA-LION replied: {text[:100]}...")
    return jsonify({"text": text}), 200

# ─── MERALION: Get presigned upload URL ───────────────────────────────────────
@app.route("/upload-url", methods=["POST"])
def upload_url():
    res = requests.post(f"{MERALION_BASE}/upload-url", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

# ─── MERALION: Upload audio to S3 (proxied) ───────────────────────────────────
@app.route("/upload-s3", methods=["PUT"])
def upload_s3():
    s3_url = request.args.get("url")
    res = requests.put(s3_url, data=request.data, headers={"Content-Type": "audio/wav"})
    return ("", res.status_code)

# ─── MERALION: Transcribe audio ───────────────────────────────────────────────
@app.route("/transcribe", methods=["POST"])
def transcribe():
    res = requests.post(f"{MERALION_BASE}/transcribe", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

# ─── MERALION: Analyze emotion / paralinguistics ──────────────────────────────
@app.route("/analyze", methods=["POST"])
def analyze():
    res = requests.post(f"{MERALION_BASE}/analyze", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

# ─── MERALION: Process (symptom scoring after session) ────────────────────────
@app.route("/process", methods=["POST"])
def process():
    res = requests.post(f"{MERALION_BASE}/process", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

# ─── MERALION: Summarize session ──────────────────────────────────────────────
@app.route("/summarize", methods=["POST"])
def summarize():
    res = requests.post(f"{MERALION_BASE}/summarize", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

if __name__ == "__main__":
    print("✅ Momenta backend running at http://localhost:5000")
    print("🦁 SEA-LION chat ready via Cloudflare")
    print("🎙 MERaLiON voice transcription ready")
    app.run(debug=False, port=5000)
