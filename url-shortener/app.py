
import os
import random
import string
from datetime import datetime, timezone

import validators
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request
from pymongo import MongoClient, errors as mongo_errors

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "url_shortener")
BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:5000").rstrip("/")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[MONGO_DB_NAME]
urls_collection = db["urls"]

# short_code must be unique
urls_collection.create_index("short_code", unique=True)


def check_mongo_connection():
    try:
        client.admin.command("ping")
        return True
    except mongo_errors.PyMongoError:
        return False

ALPHABET = string.ascii_letters + string.digits  # 62 characters
CODE_LENGTH = 6


def generate_short_code(length: int = CODE_LENGTH) -> str:

    while True:
        code = "".join(random.choices(ALPHABET, k=length))
        if not urls_collection.find_one({"short_code": code}):
            return code


def is_valid_url(url: str) -> bool:
    return bool(validators.url(url))


def serialize_url(doc) -> dict:
    return {
        "short_code": doc["short_code"],
        "short_url": f"{BASE_URL}/{doc['short_code']}",
        "original_url": doc["original_url"],
        "clicks": doc.get("clicks", 0),
        "created_at": doc["created_at"].isoformat() if isinstance(
            doc.get("created_at"), datetime
        ) else doc.get("created_at"),
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/shorten", methods=["POST"])
def shorten_url():
    data = request.get_json(silent=True) or {}
    original_url = (data.get("url") or "").strip()
    custom_code = (data.get("custom_code") or "").strip()

    if not original_url:
        return jsonify({"error": "A URL is required."}), 400

    if not is_valid_url(original_url):
        return jsonify({"error": "That doesn't look like a valid URL. Include http:// or https://"}), 400

    if custom_code:
        if not custom_code.isalnum():
            return jsonify({"error": "Custom codes can only contain letters and numbers."}), 400
        if len(custom_code) > 20:
            return jsonify({"error": "Custom codes must be 20 characters or fewer."}), 400
        if urls_collection.find_one({"short_code": custom_code}):
            return jsonify({"error": "That custom code is already taken."}), 409
        short_code = custom_code
    else:
        # If the same long URL was already shortened, return the existing entry
        existing = urls_collection.find_one({"original_url": original_url, "is_custom": False})
        if existing:
            return jsonify(serialize_url(existing)), 200
        short_code = generate_short_code()

    doc = {
        "short_code": short_code,
        "original_url": original_url,
        "created_at": datetime.now(timezone.utc),
        "clicks": 0,
        "is_custom": bool(custom_code),
    }

    try:
        urls_collection.insert_one(doc)
    except mongo_errors.DuplicateKeyError:
        return jsonify({"error": "That short code is already taken. Please try again."}), 409

    return jsonify(serialize_url(doc)), 201


@app.route("/api/urls", methods=["GET"])
def list_urls():
    docs = urls_collection.find().sort("created_at", -1).limit(20)
    return jsonify([serialize_url(d) for d in docs])


@app.route("/api/stats/<code>", methods=["GET"])
def url_stats(code):
    doc = urls_collection.find_one({"short_code": code})
    if not doc:
        return jsonify({"error": "Short code not found."}), 404
    return jsonify(serialize_url(doc))


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"mongo_connected": check_mongo_connection()})

@app.route("/<code>")
def redirect_to_original(code):
    doc = urls_collection.find_one_and_update(
        {"short_code": code},
        {"$inc": {"clicks": 1}},
    )
    if not doc:
        return render_template("index.html", not_found_code=code), 404
    return redirect(doc["original_url"])


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", debug=debug, port=port)
