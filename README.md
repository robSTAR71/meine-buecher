# 📚 Meine Bücher

Persönliche Buchverwaltung mit Node.js + SQLite, gehostet auf Render.

## Setup

### 1. GitHub Repository anlegen
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-USER/meine-buecher.git
git push -u origin main
```

### 2. Render-Dienst erstellen
1. [render.com](https://render.com) → "New Web Service"
2. GitHub-Repo verbinden
3. Render erkennt `render.yaml` automatisch
4. Unter **Environment Variables** eintragen:
   - `ANTHROPIC_API_KEY` → dein Anthropic API Key (von console.anthropic.com)

### 3. Fertig
Render baut und startet die App automatisch.  
Die URL (z.B. `https://meine-buecher.onrender.com`) funktioniert auf jedem Gerät.

## Lokale Entwicklung
```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... node server.js
# App läuft auf http://localhost:3000
```

## Kosten
- Web Service: **kostenlos** (Render Free Tier)
- Disk (1 GB): **$0.25/Monat**
