const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'buecher.json');

// ── Simple JSON database ──────────────────────────────────────────────────────
function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch(e) {}
  }
  return { books: [], nextId: 1 };
}

function saveDb(data) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getDb() {
  if (!getDb._cache) getDb._cache = loadDb();
  // Seed if empty
  if (getDb._cache.books.length === 0) {
    for (const b of DEFAULT_BOOKS) {
      getDb._cache.books.push({ id: getDb._cache.nextId++, ...b, note: '', desc: '' });
    }
    saveDb(getDb._cache);
  }
  return getDb._cache;
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Book API ──────────────────────────────────────────────────────────────────
app.get('/api/books', (req, res) => {
  res.json(getDb().books);
});

app.post('/api/books', (req, res) => {
  const { author, title, list, note } = req.body;
  if (!author || !title) return res.status(400).json({ error: 'author and title required' });
  const data = getDb();
  const book = { id: data.nextId++, author, title, list: list || 'wishlist', note: note || '', desc: '' };
  data.books.push(book);
  saveDb(data);
  res.json(book);
});

app.put('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { author, title, list, note, desc } = req.body;
  const data = getDb();
  const book = data.books.find(b => b.id === id);
  if (!book) return res.status(404).json({ error: 'not found' });
  Object.assign(book, { author, title, list, note: note ?? '', desc: desc ?? '' });
  saveDb(data);
  res.json(book);
});

app.delete('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = getDb();
  data.books = data.books.filter(b => b.id !== id);
  saveDb(data);
  res.json({ ok: true });
});

// ── Anthropic Proxy ───────────────────────────────────────────────────────────
app.post('/api/describe', async (req, res) => {
  const { author, title } = req.body;
  if (!author || !title) return res.status(400).json({ error: 'author and title required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Schreibe eine kurze, informative Beschreibung (3-5 Sätze auf Deutsch) des Buches "${title}" von ${author}. Beschreibe worum es geht, ohne Spoiler. Nur die Beschreibung, keine Überschrift, keine Einleitung.`
        }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message || 'API error' });
    const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    res.json({ description: text });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Bücher-App läuft auf Port ${PORT}`));

// ── Seed data ─────────────────────────────────────────────────────────────────
const DEFAULT_BOOKS = [
  { author: 'PURPS-PARDIGOL, Sebastian / KEHREN, Henrik', title: 'Digitalisieren mit Hirn', list: 'wishlist' },
  { author: 'BANNALEC, Jean-Luc', title: 'Bretonisches Vermächtnis (Dupin 8)', list: 'wishlist' },
  { author: 'POZNANSKI, Ursula', title: 'Cryptos', list: 'wishlist' },
  { author: 'KNAPP, Jake / ZERATSKY, John / KOWITZ, Braden', title: 'SPRINT - Wie man nur in fünf Tagen neue Ideen testet und Probleme löst', list: 'wishlist' },
  { author: 'POSSNIG, Carmen', title: 'Südlich vom Ende der Welt', list: 'wishlist' },
  { author: 'BANNALEC, Jean-Luc', title: 'Bretonische Idylle', list: 'wishlist' },
  { author: 'MENASSE, Robert', title: 'Die Erweiterung', list: 'wishlist' },
  { author: 'FRANZOBEL', title: 'Einsteins Hirn', list: 'wishlist' },
  { author: 'STROBEL, Arno', title: 'Mörderfinder - Das Muster des Bösen (Max Bischoff 5)', list: 'wishlist' },
  { author: 'HÜNNEBECK, Marcus', title: 'Der Schädelbrecher', list: 'reading' },
  { author: 'GRUBER, Monika / HOCK, Andreas', title: 'Und erlöse uns von den Blöden', list: 'reading' },
  { author: 'SCHALKO, David', title: 'Schwere Knochen', list: 'reading' },
  { author: 'POLLACK, Manuel', title: 'Der Tote im Bunker', list: 'reading' },
  { author: 'HÄFFNER, Hannah', title: 'Die Riesinnen', list: 'reading' },
  { author: 'GRUBER, Andreas', title: 'Herztluch', list: 'y2026' },
  { author: 'SCHLINK, Bernhard', title: 'Das späte Leben', list: 'y2026' },
  { author: 'POZNANSKI, Ursula', title: 'Das Signal', list: 'y2026' },
  { author: 'ROSENFELDT, Hans', title: 'Die Farm der Mädchen', list: 'y2026' },
  { author: 'RIDZÉN, Lisa', title: 'Wenn die Kraniche nach Süden ziehen', list: 'y2026' },
  { author: 'TSOKOS, Michael', title: 'Mit kaltem Kalkül', list: 'y2026' },
  { author: 'HAOHUI, Zhou', title: '18/4 - Der Hauptmann und der Mörder', list: 'y2026' },
  { author: 'SLUPETZKY, Stefan', title: 'Nichts wie weg', list: 'y2026' },
  { author: 'JENSEN, Jens Henrik', title: 'Interregnum (Oxen 7)', list: 'y2026' },
  { author: 'WINKELMANN, Andreas', title: 'Moorland', list: 'y2026' },
  { author: 'ADICHIE, Chimamanda Ngozi', title: 'Blauer Hibiskus', list: 'y2025' },
  { author: 'NOLL, Ingrid', title: 'Die Häupter meiner Lieben', list: 'y2025' },
  { author: 'RODE, Tim', title: 'Lupus', list: 'y2025' },
  { author: 'BEER, Alex', title: 'Die weiße Stunde', list: 'y2025' },
  { author: 'KNECHT, Doris', title: 'Gruber geht', list: 'y2025' },
  { author: 'GLATTAUER, Daniel', title: 'In einem Zug', list: 'y2025' },
  { author: 'WAHL, Caroline', title: 'Windstärke 17', list: 'y2025' },
  { author: 'POZNANSKI, Ursula', title: 'Teufelstanz', list: 'y2025' },
  { author: 'STIPSITS, Thomas', title: 'Allerheiligen-Fiasko', list: 'y2025' },
  { author: 'FRANLEY, Mark', title: 'Heuchler (Mike Kostner 01)', list: 'y2025' },
  { author: 'KEHLMANN, Daniel', title: 'Tyll', list: 'y2025' },
  { author: 'HAAS, Wolf', title: 'Wackelkontakt', list: 'y2025' },
  { author: 'BÖRJLIND, Cilla & Rolf', title: 'Der gute Samariter (Die Rönning/Stilton-Serie 7)', list: 'y2025' },
  { author: 'CORS, Benjamin', title: 'Aschesommer', list: 'y2025' },
  { author: 'FITZEK, Sebastian', title: 'Horror-Date: Kein Thriller', list: 'y2025' },
  { author: 'BÖRJLIND, Cilla & Rolf', title: 'Die Springflut (Die Rönning/Stilton - Serie 1)', list: 'y2025' },
  { author: 'JONASSON, Jonas', title: 'Der verliebte Schwarzbrenner und wie er die Welt sah', list: 'y2025' },
  { author: 'AICHNER, Bernhard', title: 'John', list: 'y2025' },
  { author: 'SAFIER, David', title: 'Die Liebe sucht ein Zimmer', list: 'y2025' },
  { author: 'KLIESCH, Vincent', title: 'Auris 6 - Puls der Angst', list: 'y2025' },
  { author: 'RAABE, Marc', title: 'Die Nacht', list: 'y2025' },
  { author: 'ROSSMANN, Eva', title: 'Alles Gute', list: 'y2025' },
  { author: 'BREZINA, Thomas', title: 'Aus für Strauss', list: 'y2025' },
  { author: 'RODE, Tibor', title: 'Das Morpheus-Gen', list: 'y2025' },
  { author: 'STEN, Viveca', title: 'Tief im Schnee (Hannah Ahlander 02)', list: 'y2025' },
  { author: 'HILLENBRAND, Tom', title: 'Lieferdienst', list: 'y2025' },
  { author: 'BILKAU, Kristina', title: 'Halbinsel', list: 'y2025' },
  { author: 'FRANZ, Andreas', title: 'Jung, Blond, tot', list: 'y2025' },
  { author: 'WINKELMANN, Andreas', title: 'Ihr werdet sie nicht finden', list: 'y2025' },
  { author: 'KNECHT, Doris', title: 'Ja, nein, vielleicht', list: 'y2025' },
  { author: 'WAHL, Caroline', title: 'Die Assistentin', list: 'y2025' },
  { author: 'ÆGISDÓTTIR, Eva Björg', title: 'Verschwiegen', list: 'y2025' },
  { author: 'FITZEK, Sebastian', title: 'Der Nachbar', list: 'y2025' },
  { author: 'BECKETT, Simon', title: 'Knochenstärke', list: 'y2025' },
  { author: 'HENN, Carsten', title: 'Sonnenuntergang Nr. 5', list: 'y2025' },
  { author: 'GEIGER, Arno', title: 'Unter der Drachenwand', list: 'y2024' },
  { author: 'DUTZLER, Herbert', title: 'Letzter Tropfen', list: 'y2024' },
  { author: 'QUIRK, Matthew', title: 'Die 500', list: 'y2024' },
  { author: 'EXTENCE, Gavin', title: 'Libellen im Kopf', list: 'y2024' },
  { author: 'PRESTON, Douglas / CHILD, Lincoln', title: 'Death - Das Kabinett von Dr. Leng', list: 'y2024' },
  { author: 'STROBEL, Arno', title: 'Mörderfinder - Mit den Augen des Opfers (Band 3)', list: 'y2024' },
  { author: 'GERLING, Volker', title: 'Kopfgeld', list: 'y2024' },
  { author: 'DUGONI, Robert', title: 'Die achte Schwester', list: 'y2024' },
  { author: 'OSTROWSKI, Michael', title: 'Der Onkel', list: 'y2024' },
  { author: 'JENSEN, Jens Henrik', title: 'EAST - Auf tiefem Grund', list: 'y2024' },
  { author: 'RHUE, Morton', title: 'Die Welle', list: 'y2024' },
  { author: 'SCHLINK, Bernhard', title: 'Der Vorleser', list: 'y2024' },
  { author: 'ROSSBACHER, Claudia', title: 'Steirerwald', list: 'y2024' },
  { author: 'SAFIER, David', title: 'Miss Merkel auf hoher See', list: 'y2024' },
  { author: 'NEUHAUS, Nele', title: 'Monster', list: 'y2024' },
  { author: 'WINN, Raynor', title: 'Der Salzpfad', list: 'y2024' },
  { author: 'CORS, Benjamin', title: 'Krähentage', list: 'y2024' },
  { author: 'COBEN, Harlan', title: 'Der Junge aus dem Wald', list: 'y2024' },
  { author: 'LAUB, Uwe', title: 'Leben', list: 'y2024' },
  { author: 'JENSEN, Jens Henrik', title: 'Pilgrim (Oxen 6)', list: 'y2024' },
  { author: 'BERGMANN, Michel', title: 'Der Rabbi und der Kommissar, Du sollst nicht morden', list: 'y2024' },
  { author: 'BEER, Alex', title: 'Der Schatten von Berlin', list: 'y2024' },
  { author: 'HANSEN, Dörte', title: 'Zur See', list: 'y2024' },
  { author: 'KLIESCH, Vincent', title: 'Tödlicher Schall', list: 'y2024' },
  { author: 'POZNANSKI, Ursula', title: 'Scandor', list: 'y2024' },
  { author: 'AICHNER, Bernhard', title: 'Yoko', list: 'y2024' },
  { author: 'HALLER, Elias', title: 'Schneewittchen stirbt', list: 'y2024' },
  { author: 'WAHL, Caroline', title: '22 Bahnen', list: 'y2024' },
  { author: 'JONASSON, Jonas', title: 'Wie die Schweden das Träumen erfanden', list: 'y2024' },
  { author: 'HENN, Carsten', title: 'Die Butterbrotbriefe', list: 'y2024' },
  { author: 'FITZEK, Sebastian', title: 'Das Kalendermädchen', list: 'y2024' },
  { author: 'GRUBER, Andreas', title: 'Todesspur', list: 'y2024' },
  { author: 'ROSSMANN, Eva', title: 'Fine Dining', list: 'y2024' },
  { author: 'SAFIER, David', title: 'Miss Merkel - Mord in der Therapie', list: 'y2024' },
  { author: 'HIRTH, Ingolf', title: 'Die Schlafwandlerin', list: 'y2023' },
  { author: 'POZNANSKI, Ursula', title: 'Böses Blut', list: 'y2023' },
  { author: 'BINGHAM, Harry', title: 'Fiona - Das tiefste Grab', list: 'y2023' },
  { author: 'AICHNER, Bernhard', title: 'Bildrauschen', list: 'y2023' },
  { author: 'MORI, Carla', title: 'HEAVY - Tödliche Erden', list: 'y2023' },
  { author: 'SEETHALER, Robert', title: 'Das Café ohne Namen', list: 'y2023' },
  { author: 'ILLINGER, Patrick', title: 'Cortex', list: 'y2023' },
  { author: 'HILLENBRAND, Tom', title: 'Montecrypto', list: 'y2023' },
  { author: 'BJÖRK, Samuel', title: 'Engelskalt', list: 'y2023' },
  { author: 'SCHUMANN, Alex', title: 'Die Überlebenden', list: 'y2023' },
  { author: 'DIEUDONNE, Adeline', title: '23 Uhr 12', list: 'y2023' },
  { author: 'GRUBER, Andreas', title: 'Rachefrühling', list: 'y2023' },
  { author: 'INDRIDASON, Arnaldur', title: 'Engelsstimme', list: 'y2023' },
  { author: 'BJÖRK, Samuel', title: 'Federgrab', list: 'y2023' },
  { author: 'BJÖRK, Samuel', title: 'Bitterherz', list: 'y2023' },
  { author: 'FITZEK, Sebastian', title: 'Die Einladung', list: 'y2023' },
  { author: 'WINKELMANN, Andreas', title: 'Das Letzte, was Du hörst', list: 'y2023' },
  { author: 'INDRIDASON, Arnaldur', title: 'Gletschergrab', list: 'y2023' },
  { author: 'LANGE, Kathrin / THIELE, Susanne', title: 'Probe 12', list: 'y2023' },
  { author: 'DURLACHER, Jessica', title: 'Die Stimme', list: 'y2023' },
  { author: 'JENSEN, Jens Henrik', title: 'SOG Land ohne Licht', list: 'y2023' },
  { author: 'RAAB, Thomas', title: 'Der Metzger fällt nicht weit vom Stamm', list: 'y2023' },
  { author: 'ELSBERG, Marc', title: 'Celsius', list: 'y2023' },
  { author: 'CORS, Benjamin', title: 'Flammenmeer', list: 'y2023' },
  { author: 'GLATTAUER, Daniel', title: 'Die spürst du nicht', list: 'y2023' },
  { author: 'FITZEK, Sebastian', title: 'Elternabend', list: 'y2023' },
];
