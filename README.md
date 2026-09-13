# CanvasFlow — AI Study Backend

This backend connects the CanvasFlow single-file frontend to Google's Gemini API.

## Why Gemini?

The selected default is `gemini-3.5-flash-lite`, a multimodal model suitable for reading textbook images. Google currently lists a free tier for this model, including free input/output tokens, subject to quota/rate limits.

## 1. Install

Requirements:
- Node.js 18+ recommended
- A Gemini API key from Google AI Studio

Then:

```bash
npm install
```

## 2. Configure (Windows easiest way)

Double-click:

`setup-gemini.bat`

Paste your Gemini API key when it asks. The script creates `.env` beside `server.js`.

Or manually create a file named `.env` beside `server.js`:

```env
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3000
```

Do NOT put the key in `public/index.html`.

## 3. Run

```bash
npm start
```

Open:

http://localhost:3000

Health check:

http://localhost:3000/api/health

## 4. How image study works

The browser converts uploaded textbook pages to base64 data URLs and sends them to:

POST /api/study

The backend converts them to Gemini inline image inputs and asks Gemini to:
- read all pages
- preserve page order
- summarize/explain/test/flashcard/etc.
- avoid inventing unsupported information

The response is returned as:

```json
{
  "ok": true,
  "mode": "summary",
  "model": "gemini-3.5-flash-lite",
  "output_text": "..."
}
```

## Important

The current browser UI is still the original single-file whiteboard app. Firebase remains separate from AI:
- Firebase Firestore/Storage = save boards and uploaded whiteboard images.
- Gemini backend = understand textbook pages and generate study material.

For production, add authentication, per-user quotas, request logging, and stricter CORS.


## Fixed in this version

- Express 5 SPA fallback no longer uses the incompatible `app.get("*")` route.
- Added `setup-gemini.bat` for easy Windows `.env` creation.
- The server prints a clear message when the Gemini key is missing.
