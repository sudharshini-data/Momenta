from flask import Flask, request, jsonify
import requests
import psycopg2
import psycopg2.extras
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── CREDENTIALS (from environment variables) ─────────────────────────────────
MERALION_API_KEY = os.environ.get("MERALION_API_KEY")
MERALION_BASE    = "https://api.cr8lab.com"
MERALION_HEADERS = {"x-api-key": MERALION_API_KEY, "Content-Type": "application/json"}

CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN  = os.environ.get("CLOUDFLARE_API_TOKEN")
SEALION_URL     = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/aisingapore/gemma-sea-lion-v4-27b-it"
SEALION_HEADERS = {"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}", "Content-Type": "application/json"}

DATABASE_URL = os.environ.get("DATABASE_URL")

# ─── DB HELPER ────────────────────────────────────────────────────────────────
def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

# ─── PATIENTS ─────────────────────────────────────────────────────────────────
@app.route("/patients", methods=["GET"])
def get_patients():
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("SELECT * FROM patients")
    patients = cur.fetchall()

    result = []
    for p in patients:
        # Get diagnoses for this patient
        cur.execute("SELECT * FROM diagnoses WHERE patient_id = %s", (p["id"],))
        diagnoses = cur.fetchall()

        diagnoses_dict = {}
        for d in diagnoses:
            # Get questions for this diagnosis
            cur.execute("SELECT * FROM questions WHERE diagnosis_id = %s", (d["id"],))
            questions = cur.fetchall()

            # Get session history for this diagnosis
            cur.execute(
                "SELECT date, scores FROM sessions WHERE patient_id = %s AND diagnosis_id = %s ORDER BY id",
                (p["id"], d["id"])
            )
            sessions = cur.fetchall()
            history = []
            for s in sessions:
                entry = {"date": s["date"]}
                entry.update(s["scores"])
                history.append(entry)

            diagnoses_dict[d["name"]] = {
                "id":          d["id"],
                "medications": d["medications"] or [],
                "questions":   [
                    {
                        "id":           str(q["id"]),
                        "label":        q["label"],
                        "type":         q["type"],
                        "radioOptions": q["radio_options"] or []
                    }
                    for q in questions
                ],
                "history": history
            }

        result.append({
            "id":          p["id"],
            "name":        p["name"],
            "age":         p["age"],
            "avatar":      p["avatar"],
            "lastCheckin": p["last_checkin"] or "",
            "role":        "patient",
            "diagnoses":   diagnoses_dict
        })

    cur.close()
    conn.close()
    return jsonify(result)

# ─── DOCTORS ──────────────────────────────────────────────────────────────────
@app.route("/doctors", methods=["GET"])
def get_doctors():
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM doctors")
    doctors = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([{**d, "role": "doctor"} for d in doctors])

# ─── SAVE SESSION ─────────────────────────────────────────────────────────────
@app.route("/sessions", methods=["POST"])
def save_session():
    data         = request.json
    patient_id   = data.get("patient_id")
    date         = data.get("date")
    scores_by_dx = data.get("scores_by_diagnosis", {})  # { diagnosis_name: { q_id: score } }

    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    for diagnosis_name, scores in scores_by_dx.items():
        # Get diagnosis id
        cur.execute(
            "SELECT id FROM diagnoses WHERE patient_id = %s AND name = %s",
            (patient_id, diagnosis_name)
        )
        row = cur.fetchone()
        if not row:
            continue
        diagnosis_id = row["id"]

        # Insert session
        cur.execute(
            "INSERT INTO sessions (patient_id, diagnosis_id, date, scores) VALUES (%s, %s, %s, %s)",
            (patient_id, diagnosis_id, date, psycopg2.extras.Json(scores))
        )

    # Update last_checkin
    today = date
    cur.execute(
        "UPDATE patients SET last_checkin = %s WHERE id = %s",
        (today, patient_id)
    )

    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})

# ─── UPDATE PATIENT (doctor edits diagnoses/questions/meds) ───────────────────
@app.route("/patients/<patient_id>/diagnoses", methods=["PUT"])
def update_diagnoses(patient_id):
    data     = request.json  # { diagnosis_name: { medications, questions } }
    conn     = get_db()
    cur      = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    for dx_name, dx_data in data.items():
        # Upsert diagnosis
        cur.execute(
            "SELECT id FROM diagnoses WHERE patient_id = %s AND name = %s",
            (patient_id, dx_name)
        )
        row = cur.fetchone()
        if row:
            dx_id = row["id"]
            cur.execute(
                "UPDATE diagnoses SET medications = %s WHERE id = %s",
                (dx_data.get("medications", []), dx_id)
            )
        else:
            cur.execute(
                "INSERT INTO diagnoses (patient_id, name, medications) VALUES (%s, %s, %s) RETURNING id",
                (patient_id, dx_name, dx_data.get("medications", []))
            )
            dx_id = cur.fetchone()["id"]

        # Replace questions
        cur.execute("DELETE FROM questions WHERE diagnosis_id = %s", (dx_id,))
        for q in dx_data.get("questions", []):
            cur.execute(
                "INSERT INTO questions (diagnosis_id, label, type, radio_options) VALUES (%s, %s, %s, %s)",
                (dx_id, q["label"], q["type"], q.get("radioOptions") or None)
            )

    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"success": True})

# ─── SEA-LION CHAT ─────────────────────────────────────────────────────────────
@app.route("/sealion-chat", methods=["POST"])
def sealion_chat():
    data     = request.json
    messages = data.get("messages", [])
    system   = data.get("system", "")
    trimmed  = messages[-4:] if len(messages) > 4 else messages
    payload  = {
        "messages":    [{"role": "system", "content": system}] + trimmed,
        "max_tokens":  256,
        "temperature": 0.7
    }
    res    = requests.post(SEALION_URL, json=payload, headers=SEALION_HEADERS)
    result = res.json()
    if not result.get("success"):
        return jsonify({"text": f"SEA-LION error: {result.get('errors')}"}), 500
    text = result.get("result", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
    if not text:
        return jsonify({"text": "Sorry, could you say that again?"}), 200
    return jsonify({"text": text}), 200

# ─── MERALION ─────────────────────────────────────────────────────────────────
@app.route("/upload-url", methods=["POST"])
def upload_url():
    res = requests.post(f"{MERALION_BASE}/upload-url", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

@app.route("/upload-s3", methods=["PUT"])
def upload_s3():
    s3_url = request.args.get("url")
    res    = requests.put(s3_url, data=request.data, headers={"Content-Type": "audio/wav"})
    return ("", res.status_code)

@app.route("/transcribe", methods=["POST"])
def transcribe():
    res = requests.post(f"{MERALION_BASE}/transcribe", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

@app.route("/analyze", methods=["POST"])
def analyze():
    res = requests.post(f"{MERALION_BASE}/analyze", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

@app.route("/process", methods=["POST"])
def process():
    res = requests.post(f"{MERALION_BASE}/process", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

@app.route("/summarize", methods=["POST"])
def summarize():
    res = requests.post(f"{MERALION_BASE}/summarize", json=request.json, headers=MERALION_HEADERS)
    return jsonify(res.json()), res.status_code

if __name__ == "__main__":
    print("✅ Momenta backend running at http://localhost:5000")
    print("🦁 SEA-LION chat ready via Cloudflare")
    print("🎙 MERaLiON voice transcription ready")
    app.run(debug=False, port=5000)
