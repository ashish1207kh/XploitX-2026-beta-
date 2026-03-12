// server.js
require('dotenv').config();
const express = require('express');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3004;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ───────────────────────────────────────────────────
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Catch-all: serve index (auth page)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   D.F.I.R. CASE #04 // SERVER ONLINE     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Storage : data.json (local file)`);
  console.log(`  PORT    : http://localhost:${PORT}\n`);
});