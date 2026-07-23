# Deploying to Render + MongoDB Atlas (free)

This gets your URL shortener live on the public internet, for free, in about
15 minutes. Two parts: a cloud database (MongoDB Atlas) and a hosted web
service (Render).

---

## Part 1 — MongoDB Atlas (your database)

1. Go to https://www.mongodb.com/atlas and sign up (free).
2. Create a new **free (M0) cluster** — any cloud provider/region is fine.
3. **Create a database user**:
   - Left sidebar → *Database Access* → *Add New Database User*
   - Choose a username/password (save these — you'll need them in a moment)
4. **Allow network access**:
   - Left sidebar → *Network Access* → *Add IP Address*
   - Click **"Allow Access from Anywhere"** (`0.0.0.0/0`) — simplest for a small project;
     Render's servers use dynamic IPs so this is the practical option here.
5. **Get your connection string**:
   - Go to *Database* → click **Connect** on your cluster → **Drivers**
   - Copy the string, it looks like:
     `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - Replace `<username>` and `<password>` with the database user you created in step 3.

Keep this string handy — it's your `MONGO_URI` for the next part.

---

## Part 2 — Push your code to GitHub

Render deploys from a GitHub repo.

```bash
cd url-shortener
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repo on https://github.com/new, then:

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

(`.gitignore` already excludes `venv/`, `.env`, and `__pycache__/`, so your
secrets won't be pushed.)

---

## Part 3 — Deploy on Render

1. Go to https://render.com and sign up (you can sign in with GitHub).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account and select the repo you just pushed.
4. Fill in the settings:
   | Setting | Value |
   |---|---|
   | Name | anything, e.g. `simple-url-shortener` |
   | Region | closest to you |
   | Branch | `main` |
   | Runtime | Python 3 |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `gunicorn app:app` |
   | Instance Type | Free |

5. Scroll to **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `MONGO_URI` | your Atlas connection string from Part 1 |
   | `MONGO_DB_NAME` | `url_shortener` |
   | `BASE_URL` | leave blank for now — you'll fill this in after the first deploy |
   | `FLASK_SECRET_KEY` | any random string |
   | `FLASK_DEBUG` | `False` |

6. Click **Create Web Service**. Render will build and deploy — takes 2-5 minutes.
7. Once it's live, Render gives you a URL like `https://simple-url-shortener.onrender.com`.
   Go back into **Environment**, set `BASE_URL` to that exact URL (no trailing slash),
   and save — this makes the short links point at your live domain instead of
   `localhost`. Render will auto-redeploy.

---

## Verify it works

- Visit your Render URL — the status dot should turn teal ("mongodb connected").
- Shorten a link, then click it to confirm the redirect works.

## Notes on the free tier

- Render's free web services **spin down after ~15 minutes of inactivity** and take
  ~30-50 seconds to wake back up on the next request. Fine for a demo/portfolio
  project; if you need it always-on, upgrade to a paid instance.
- Atlas's free M0 cluster has a 512MB storage cap — plenty for this project.

## Updating your live app later

Any time you push new commits to `main`, Render redeploys automatically:

```bash
git add .
git commit -m "Some change"
git push
```
