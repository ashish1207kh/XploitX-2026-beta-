// routes/api.js
const express = require('express');
const router  = express.Router();
const {
  hasAlreadySubmitted,
  saveSubmission,
  getAllSubmissions,
  getBestPerTeam,
  getStats
} = require('../models/Submission');

// ============================================================
// POST /api/auth/verify
// Checks credentials. Blocks if investigator already submitted.
// ============================================================
router.post('/auth/verify', (req, res) => {
  try {
    const { team_name, investigator_id } = req.body;

    if (!team_name || !investigator_id) {
      return res.status(400).json({
        success: false,
        error:   'MISSING_CREDENTIALS',
        message: 'team_name and investigator_id are required.'
      });
    }

    const normalizedTeam = team_name.trim().toUpperCase();
    const normalizedId   = investigator_id.trim();

    // Block if already submitted
    if (hasAlreadySubmitted(normalizedTeam, normalizedId)) {
      return res.status(403).json({
        success: false,
        error:   'ALREADY_SUBMITTED',
        message: `ACCESS_DENIED // INVESTIGATOR_${normalizedId} HAS ALREADY COMPLETED MISSION. ONE_ATTEMPT_PER_OPERATIVE.`
      });
    }

    return res.json({
      success:         true,
      status:          'ACCESS_GRANTED',
      team_name:       normalizedTeam,
      investigator_id: normalizedId,
      message:         'INVESTIGATOR_VERIFIED // PROCEED_TO_MISSION'
    });

  } catch (err) {
    console.error('[AUTH]', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ============================================================
// POST /api/submit
// Saves quiz score. One attempt per investigator enforced.
// ============================================================
router.post('/submit', (req, res) => {
  try {
    const { team_name, investigator_id, score, answers } = req.body;

    if (!team_name || !investigator_id || score === undefined) {
      return res.status(400).json({
        success: false,
        error:   'MISSING_FIELDS',
        message: 'team_name, investigator_id, and score are required.'
      });
    }

    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 25) {
      return res.status(400).json({
        success: false,
        error:   'INVALID_SCORE',
        message: 'Score must be between 0 and 25.'
      });
    }

    const normalizedTeam = team_name.trim().toUpperCase();
    const normalizedId   = investigator_id.trim();

    // Hard block: one attempt per investigator
    if (hasAlreadySubmitted(normalizedTeam, normalizedId)) {
      return res.status(403).json({
        success: false,
        error:   'ALREADY_SUBMITTED',
        message: 'DUPLICATE_SUBMISSION_BLOCKED // ONE_ATTEMPT_PER_OPERATIVE'
      });
    }

    const submission = saveSubmission(normalizedTeam, normalizedId, parsedScore, answers);

    console.log(`[SUBMIT] ${normalizedTeam} / ${normalizedId} => ${parsedScore}/25 (${submission.rank_title})`);

    return res.status(201).json({
      success:    true,
      status:     'EVIDENCE_LOGGED',
      team_name:  normalizedTeam,
      investigator_id: normalizedId,
      score:      parsedScore,
      rank_title: submission.rank_title,
      timestamp:  submission.timestamp
    });

  } catch (err) {
    console.error('[SUBMIT]', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ============================================================
// GET /api/leaderboard
// Returns best score per team, sorted score DESC, time ASC
// ============================================================
router.get('/leaderboard', (req, res) => {
  try {
    const bestTeams = getBestPerTeam();
    const stats     = getStats();

    const leaderboard = bestTeams.map((team, idx) => ({
      rank_position:   idx + 1,
      team_name:       team.team_name,
      investigator_id: team.investigator_id,
      score:           team.score,
      rank_title:      team.rank_title,
      timestamp:       team.timestamp
    }));

    return res.json({
      success: true,
      data: { leaderboard, stats }
    });

  } catch (err) {
    console.error('[LEADERBOARD]', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ============================================================
// GET /api/submissions
// All raw submissions (full database view)
// ============================================================
router.get('/submissions', (req, res) => {
  try {
    const submissions = getAllSubmissions();
    return res.json({ success: true, count: submissions.length, data: submissions });
  } catch (err) {
    console.error('[SUBMISSIONS]', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

module.exports = router;