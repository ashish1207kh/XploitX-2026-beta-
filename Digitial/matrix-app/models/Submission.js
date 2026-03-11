// models/Submission.js
// File-based storage — reads/writes to data.json in project root

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

// ── Read all submissions from file ───────────────────────────
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ submissions: [] }, null, 2));
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

// ── Write all submissions to file ────────────────────────────
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Get rank title from score ────────────────────────────────
function getRankTitle(score) {
  if (score <= 12) return 'BLUE PILL';
  if (score <= 23) return 'RED PILL';
  return 'THE ONE';
}

// ── Check if investigator already submitted ──────────────────
function hasAlreadySubmitted(team_name, investigator_id) {
  const { submissions } = readData();
  return submissions.some(
    s => s.team_name === team_name.toUpperCase() &&
         s.investigator_id === investigator_id.trim()
  );
}

// ── Save a new submission ────────────────────────────────────
function saveSubmission(team_name, investigator_id, score, answers) {
  const data = readData();
  const submission = {
    id:             Date.now().toString(),
    team_name:      team_name.toUpperCase(),
    investigator_id:investigator_id.trim(),
    score:          parseInt(score),
    rank_title:     getRankTitle(score),
    answers:        answers || {},
    timestamp:      new Date().toISOString()
  };
  data.submissions.push(submission);
  writeData(data);
  return submission;
}

// ── Get all submissions ──────────────────────────────────────
function getAllSubmissions() {
  const { submissions } = readData();
  return submissions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ── Get best submission per team (One-Team-One-Rank) ─────────
// Logic: for each unique team, keep only the highest score.
// Tie-breaker: earliest timestamp wins.
function getBestPerTeam() {
  const { submissions } = readData();
  const teamMap = new Map();

  submissions.forEach(s => {
    const existing = teamMap.get(s.team_name);
    if (!existing) {
      teamMap.set(s.team_name, s);
    } else if (
      s.score > existing.score ||
      (s.score === existing.score && new Date(s.timestamp) < new Date(existing.timestamp))
    ) {
      teamMap.set(s.team_name, s);
    }
  });

  // Sort by score DESC, then timestamp ASC
  return Array.from(teamMap.values())
    .sort((a, b) => b.score - a.score || new Date(a.timestamp) - new Date(b.timestamp));
}

// ── Get stats ────────────────────────────────────────────────
function getStats() {
  const { submissions } = readData();
  const bestTeams = getBestPerTeam();
  return {
    total_submissions: submissions.length,
    unique_teams:      bestTeams.length,
    top_score:         bestTeams.length ? bestTeams[0].score : 0,
    last_updated:      new Date().toISOString()
  };
}

module.exports = {
  hasAlreadySubmitted,
  saveSubmission,
  getAllSubmissions,
  getBestPerTeam,
  getStats,
  getRankTitle
};