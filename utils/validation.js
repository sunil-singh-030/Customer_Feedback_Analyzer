/**
 * Validation utilities for Customer Feedback Analyzer.
 * Validates request payload and verifies AI / Mock output schemas.
 */

const ALLOWED_THEMES = new Set([
  'Performance',
  'Usability',
  'Authentication',
  'Reporting',
  'Search',
  'Pricing',
  'Onboarding',
  'Other'
]);

const ALLOWED_SENTIMENTS = new Set(['Positive', 'Neutral', 'Negative']);
const ALLOWED_URGENCIES = new Set(['High', 'Medium', 'Low']);
const ALLOWED_SIGNALS = new Set([
  'None',
  'Workflow blocker',
  'Rollout blocker',
  'Potential churn'
]);
const ALLOWED_PRIORITIES = new Set(['High', 'Medium', 'Low']);

const MAX_COMMENTS = 30;
const MAX_COMMENT_LENGTH = 1000;

/**
 * Validates and cleans raw comment input.
 * @param {any} commentsInput - Array of comment strings or raw multiline input.
 * @returns {string[]} Array of non-empty trimmed comment strings.
 */
function validateInputComments(commentsInput) {
  let lines = [];
  if (Array.isArray(commentsInput)) {
    lines = commentsInput;
  } else if (typeof commentsInput === 'string') {
    lines = commentsInput.split('\n');
  } else {
    throw new Error('Invalid input format. Comments must be an array or string.');
  }

  // Trim whitespace and filter out blank lines
  const cleaned = lines
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter((c) => c.length > 0);

  if (cleaned.length === 0) {
    throw new Error('Please enter at least one valid feedback comment.');
  }

  if (cleaned.length > MAX_COMMENTS) {
    throw new Error(
      `Feedback exceeds maximum limit of ${MAX_COMMENTS} comments (provided: ${cleaned.length}).`
    );
  }

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i].length > MAX_COMMENT_LENGTH) {
      throw new Error(
        `Comment ${i + 1} exceeds maximum length of ${MAX_COMMENT_LENGTH} characters.`
      );
    }
  }

  return cleaned;
}

/**
 * Validates analysis output object against strict structure and integrity rules.
 * @param {any} output - AI or mock output object.
 * @param {number} expectedCount - Total number of feedback items analyzed.
 * @returns {object} Validated analysis object.
 */
function validateAnalysisOutput(output, expectedCount) {
  if (!output || typeof output !== 'object') {
    throw new Error('Analysis response must be a JSON object.');
  }

  const { items, painPoints, recommendations } = output;

  if (!Array.isArray(items)) {
    throw new Error('Analysis output missing "items" array.');
  }

  if (items.length !== expectedCount) {
    throw new Error(
      `Analysis items count (${items.length}) does not match input count (${expectedCount}).`
    );
  }

  const seenIds = new Set();
  items.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Item at index ${idx} is not an object.`);
    }

    const { id, theme, sentiment, urgency, reason, signal } = item;

    if (typeof id !== 'number' || id < 1 || id > expectedCount) {
      throw new Error(
        `Invalid or missing item ID: ${id}. Expected number between 1 and ${expectedCount}.`
      );
    }

    if (seenIds.has(id)) {
      throw new Error(`Duplicate item ID found in analysis: ${id}.`);
    }
    seenIds.add(id);

    if (!ALLOWED_THEMES.has(theme)) {
      throw new Error(`Item ${id} has invalid theme: "${theme}".`);
    }

    if (!ALLOWED_SENTIMENTS.has(sentiment)) {
      throw new Error(`Item ${id} has invalid sentiment: "${sentiment}".`);
    }

    if (!ALLOWED_URGENCIES.has(urgency)) {
      throw new Error(`Item ${id} has invalid urgency: "${urgency}".`);
    }

    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new Error(`Item ${id} is missing a non-empty explanation reason.`);
    }

    if (!ALLOWED_SIGNALS.has(signal)) {
      throw new Error(`Item ${id} has invalid signal: "${signal}".`);
    }
  });

  // Verify all IDs from 1..expectedCount are covered
  for (let i = 1; i <= expectedCount; i++) {
    if (!seenIds.has(i)) {
      throw new Error(`Missing feedback ID in analysis output: ${i}.`);
    }
  }

  // Validate painPoints array
  if (!Array.isArray(painPoints)) {
    throw new Error('Analysis output missing "painPoints" array.');
  }

  painPoints.forEach((pp, idx) => {
    if (!pp || typeof pp !== 'object') {
      throw new Error(`Pain point at index ${idx} is not an object.`);
    }

    if (typeof pp.statement !== 'string' || pp.statement.trim() === '') {
      throw new Error(`Pain point at index ${idx} missing valid statement.`);
    }

    if (!Array.isArray(pp.feedbackIds) || pp.feedbackIds.length === 0) {
      throw new Error(
        `Pain point "${pp.statement}" must reference at least one feedback ID.`
      );
    }

    pp.feedbackIds.forEach((refId) => {
      if (!seenIds.has(refId)) {
        throw new Error(
          `Pain point references non-existent feedback ID: ${refId}.`
        );
      }
    });
  });

  // Validate recommendations array
  if (!Array.isArray(recommendations)) {
    throw new Error('Analysis output missing "recommendations" array.');
  }

  recommendations.forEach((rec, idx) => {
    if (!rec || typeof rec !== 'object') {
      throw new Error(`Recommendation at index ${idx} is not an object.`);
    }

    if (typeof rec.action !== 'string' || rec.action.trim() === '') {
      throw new Error(`Recommendation at index ${idx} missing valid action.`);
    }

    if (!ALLOWED_PRIORITIES.has(rec.priority)) {
      throw new Error(
        `Recommendation "${rec.action}" has invalid priority: "${rec.priority}".`
      );
    }

    if (typeof rec.rationale !== 'string' || rec.rationale.trim() === '') {
      throw new Error(`Recommendation "${rec.action}" missing rationale.`);
    }

    if (!Array.isArray(rec.feedbackIds) || rec.feedbackIds.length === 0) {
      throw new Error(
        `Recommendation "${rec.action}" must reference at least one feedback ID.`
      );
    }

    rec.feedbackIds.forEach((refId) => {
      if (!seenIds.has(refId)) {
        throw new Error(
          `Recommendation references non-existent feedback ID: ${refId}.`
        );
      }
    });
  });

  return { items, painPoints, recommendations };
}

module.exports = {
  validateInputComments,
  validateAnalysisOutput,
  ALLOWED_THEMES: Array.from(ALLOWED_THEMES),
  ALLOWED_SENTIMENTS: Array.from(ALLOWED_SENTIMENTS),
  ALLOWED_URGENCIES: Array.from(ALLOWED_URGENCIES),
  ALLOWED_SIGNALS: Array.from(ALLOWED_SIGNALS)
};
