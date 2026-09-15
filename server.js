/**
 * Express Server for Customer Feedback Analyzer.
 * Serves static frontend and POST /api/analyze endpoint.
 */

require('dotenv').config();
const path = require('path');
const express = require('express');

const { validateInputComments } = require('./utils/validation');
const { analyzeFeedbackMock } = require('./services/mockAnalyzer');
const { analyzeFeedbackAI } = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing with safe size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

/**
 * POST /api/analyze
 * Accepts feedback comments, validates input, executes analysis (Live AI or Mock),
 * verifies schema integrity, and returns structured result with original text.
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const rawComments = req.body.comments;

    // 1. Input Validation
    const cleanComments = validateInputComments(rawComments);

    // Prepare original comments with IDs
    const commentsList = cleanComments.map((text, idx) => ({
      id: idx + 1,
      text: text
    }));

    // 2. Determine Analysis Mode
    const mode = (process.env.AI_MODE || 'mock').toLowerCase() === 'live' ? 'live' : 'mock';

    let analysisResult;
    if (mode === 'live') {
      analysisResult = await analyzeFeedbackAI(cleanComments);
    } else {
      analysisResult = await analyzeFeedbackMock(cleanComments);
    }

    // 3. Return JSON response
    return res.status(200).json({
      success: true,
      mode: mode,
      totalCount: cleanComments.length,
      comments: commentsList,
      analysis: analysisResult
    });
  } catch (err) {
    console.error(`[/api/analyze error]: ${err.message}`);

    // Return friendly error response
    const statusCode = err.message.includes('Limit') || err.message.includes('Invalid input') || err.message.includes('Please enter')
      ? 400
      : 500;

    return res.status(statusCode).json({
      success: false,
      error: err.message || 'An unexpected error occurred during feedback analysis.'
    });
  }
});

// Fallback route serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Customer Feedback Analyzer Server Running `);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Mode: ${process.env.AI_MODE || 'mock'}`);
  console.log(`=======================================================`);
});

module.exports = app;
