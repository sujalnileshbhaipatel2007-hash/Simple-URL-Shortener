# Simple URL Shortener

A small full-stack project: **Flask** + **MongoDB** on the backend, plain **HTML/CSS/JS** on the frontend (no build step, no frameworks).

## Features

- Shorten any valid URL to a 6-character code
- Optional custom short codes (`/my-link`)
- Click tracking per short link
- Redirect endpoint (`/<code>`)
- Recent-links table with live refresh
- Backend health indicator (checks MongoDB connectivity)
- Duplicate detection (re-shortening the same URL returns the existing code)

## Project structure

```
url-shortener/
├── app.py                # Flask app + all API routes
├── requirements.txt
├── Procfile               # tells Render/Railway how to start the app
├── .gitignore
├── .env.example           # copy to .env and edit
├── DEPLOY.md              # step-by-step deployment guide
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

## 1. Prerequisites

- Python 3.9+
- MongoDB running somewhere reachable — either:
  - **Local**: install MongoDB Community Edition and run `mongod` (default `mongodb://localhost:27017/`), or
  - **Atlas** (free tier): create a cluster at https://www.mongodb.com/atlas and grab its connection string.

## 2. Setup

```bash
cd url-shortener
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# edit .env and set MONGO_URI (and BASE_URL if you're deploying somewhere)
```

## 3. Run

```bash
python app.py
```

Visit **http://127.0.0.1:5000** — the status dot in the top bar turns teal once MongoDB is connected.

## Deploying

Want to put this live on the internet? See **[DEPLOY.md](DEPLOY.md)** for a
full walkthrough using MongoDB Atlas (free database) + Render (free hosting).

## API reference

| Method | Route                | Body / Params                        | Description                          |
|--------|-----------------------|---------------------------------------|---------------------------------------|
| POST   | `/api/shorten`        | `{ "url": "...", "custom_code": "" }` | Create a short link                   |
| GET    | `/api/urls`           | —                                      | Last 20 links, newest first           |
| GET    | `/api/stats/<code>`   | —                                      | Stats for a single short link         |
| GET    | `/api/health`         | —                                      | `{ "mongo_connected": true/false }`   |
| GET    | `/<code>`             | —                                      | 302 redirect to the original URL      |

Example with `curl`:

```bash
curl -X POST http://127.0.0.1:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.anthropic.com/news"}'
```

## MongoDB document shape

Collection: `urls` (in database `url_shortener` by default)

```json
{
  "short_code": "aB3xQ1",
  "original_url": "https://example.com/some/long/path",
  "created_at": "2026-07-20T10:00:00Z",
  "clicks": 3,
  "is_custom": false
}
```

`short_code` has a unique index, created automatically on startup.

## Notes / next steps you could add

- Rate limiting on `/api/shorten` (e.g. with `Flask-Limiter`)
- Expiring links (add an `expires_at` field + a check in the redirect route)
- User accounts so people can manage their own links
- QR code generation for each short link
- Deploy: MongoDB Atlas + Render/Railway/Fly.io for the Flask app
