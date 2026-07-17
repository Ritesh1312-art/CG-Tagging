# NCF Tagging Engine 🏷️

Automated NCF Activity Tagging System for Indian teachers. Analyzes activity sheets, maps them to curricular goals (CG), cross-verifies competencies, and provides Hindi explanations — **completely free, no API key needed**.

## Features
- 📂 Select Stage → Subject CG File (from `core_folders/`)
- 📄 Fixed 21st Century Skills reference (from `fixed/`)
- 📤 Upload Chapter PDF or JPEG for deep analysis
- 🤖 Free AI tagging via Pollinations (GPT-4o, no API key)
- 💬 Interactive chatbox in Hindi/Hinglish for doubt resolution

## Tech Stack
- **Backend**: Node.js (no framework)
- **PDF extraction**: `pdf-parse`
- **Image OCR**: `tesseract.js` (eng + hin)
- **AI**: `text.pollinations.ai` (free, no API key, web scraping)

## Folder Structure
```
tagging-app/
  core_folders/       ← Your CG PDFs (organized in stage subfolders)
    01. Foundational/
    02. Preparatory/
    03. Middle/
  fixed/              ← Your fixed 21st Century Skills PDF
  uploads/            ← Temporary (auto-cleaned, gitignored)
  cache/              ← Extracted text cache (gitignored)
  public/             ← Frontend HTML/CSS/JS
  server.js           ← Backend server
  package.json
```

## Deployment on Railway (Free)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Railway will auto-detect `package.json` and run `npm start`
4. Your app will be live at `https://your-project.up.railway.app`

## Local Run
```bash
npm install
npm start
# Open http://localhost:3000
```
