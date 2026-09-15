/**
 * Validation and Mock Analyzer Unit Tests
 * Uses Node.js built-in test runner (node:test).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { validateInputComments, validateAnalysisOutput } = require('../utils/validation');
const { analyzeFeedbackMock } = require('../services/mockAnalyzer');

const SAMPLE_COMMENTS = [
  "The dashboard takes too long to load when I filter by region.",
  "I love the new export feature. It saves our team a lot of time.",
  "We cannot invite new users because the invite email never arrives.",
  "The pricing page is confusing. I do not understand what is included.",
  "Search results are not relevant when I use technical keywords.",
  "The new onboarding checklist is very helpful.",
  "We need SSO support before we can roll this out company-wide.",
  "The mobile layout breaks when viewing reports.",
  "I wish there was a way to schedule reports weekly.",
  "The product is powerful, but the setup process is too complex."
];

describe('Input Validation (validateInputComments)', () => {
  test('trims whitespace and ignores blank lines', () => {
    const raw = ['  Comment one  ', '', '   ', 'Comment two\n'];
    const result = validateInputComments(raw);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0], 'Comment one');
    assert.strictEqual(result[1], 'Comment two');
  });

  test('rejects empty input or whitespace-only input', () => {
    assert.throws(
      () => validateInputComments(['   ', '\n']),
      /Please enter at least one valid feedback comment/
    );
  });

  test('rejects more than 30 comments', () => {
    const list = Array(31).fill('Sample feedback comment');
    assert.throws(
      () => validateInputComments(list),
      /Feedback exceeds maximum limit of 30 comments/
    );
  });

  test('rejects comments exceeding 1,000 characters', () => {
    const longComment = 'a'.repeat(1001);
    assert.throws(
      () => validateInputComments([longComment]),
      /exceeds maximum length of 1000 characters/
    );
  });
});

describe('Analysis Output Integrity Validation (validateAnalysisOutput)', () => {
  const validOutput = {
    items: [
      { id: 1, theme: 'Performance', sentiment: 'Negative', urgency: 'Medium', reason: 'Slow dashboard', signal: 'None' },
      { id: 2, theme: 'Usability', sentiment: 'Positive', urgency: 'Low', reason: 'Love export', signal: 'None' }
    ],
    painPoints: [
      { statement: 'Slow dashboard performance', feedbackIds: [1] }
    ],
    recommendations: [
      { action: 'Optimize dashboard', priority: 'Medium', rationale: 'Fix latency', feedbackIds: [1] }
    ]
  };

  test('accepts valid analysis structure', () => {
    const validated = validateAnalysisOutput(validOutput, 2);
    assert.strictEqual(validated.items.length, 2);
  });

  test('rejects when item count does not match expected count', () => {
    assert.throws(
      () => validateAnalysisOutput(validOutput, 3),
      /does not match input count/
    );
  });

  test('rejects missing or duplicate item IDs', () => {
    const badOutput = {
      ...validOutput,
      items: [
        { id: 1, theme: 'Performance', sentiment: 'Negative', urgency: 'Medium', reason: 'Slow dashboard', signal: 'None' },
        { id: 1, theme: 'Usability', sentiment: 'Positive', urgency: 'Low', reason: 'Love export', signal: 'None' }
      ]
    };
    assert.throws(
      () => validateAnalysisOutput(badOutput, 2),
      /Duplicate item ID found in analysis: 1/
    );
  });

  test('rejects invalid theme or sentiment enums', () => {
    const badEnumOutput = {
      ...validOutput,
      items: [
        { id: 1, theme: 'InvalidTheme', sentiment: 'Negative', urgency: 'Medium', reason: 'Slow dashboard', signal: 'None' },
        { id: 2, theme: 'Usability', sentiment: 'Positive', urgency: 'Low', reason: 'Love export', signal: 'None' }
      ]
    };
    assert.throws(
      () => validateAnalysisOutput(badEnumOutput, 2),
      /has invalid theme/
    );
  });

  test('rejects pain points referencing non-existent IDs', () => {
    const badRefOutput = {
      ...validOutput,
      painPoints: [
        { statement: 'Slow dashboard performance', feedbackIds: [99] }
      ]
    };
    assert.throws(
      () => validateAnalysisOutput(badRefOutput, 2),
      /references non-existent feedback ID: 99/
    );
  });
});

describe('Mock Analyzer Logic & Determinism (analyzeFeedbackMock)', () => {
  test('analyzes all 10 sample comments correctly', async () => {
    const result = await analyzeFeedbackMock(SAMPLE_COMMENTS);
    
    // Check basic integrity via validator
    const validated = validateAnalysisOutput(result, 10);
    assert.strictEqual(validated.items.length, 10);

    // Sum verification
    const themeCounts = {};
    const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0 };
    const urgencyCounts = { High: 0, Medium: 0, Low: 0 };

    validated.items.forEach((item) => {
      themeCounts[item.theme] = (themeCounts[item.theme] || 0) + 1;
      sentimentCounts[item.sentiment]++;
      urgencyCounts[item.urgency]++;
    });

    const totalThemes = Object.values(themeCounts).reduce((a, b) => a + b, 0);
    const totalSentiments = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
    const totalUrgencies = Object.values(urgencyCounts).reduce((a, b) => a + b, 0);

    assert.strictEqual(totalThemes, 10, 'Theme counts must sum to 10');
    assert.strictEqual(totalSentiments, 10, 'Sentiment counts must sum to 10');
    assert.strictEqual(totalUrgencies, 10, 'Urgency counts must sum to 10');

    // SSO comment (Item #7) verification
    const ssoItem = validated.items.find((i) => i.id === 7);
    assert.strictEqual(ssoItem.urgency, 'High', 'SSO comment should be High urgency');
    assert.strictEqual(ssoItem.signal, 'Rollout blocker', 'SSO comment should be Rollout blocker');

    // Invite email comment (Item #3) verification
    const inviteItem = validated.items.find((i) => i.id === 3);
    assert.strictEqual(inviteItem.urgency, 'High', 'Invite email comment should be High urgency');
    assert.strictEqual(inviteItem.signal, 'Workflow blocker', 'Invite email comment should be Workflow blocker');

    // Praise comment (Item #2) verification
    const praiseItem = validated.items.find((i) => i.id === 2);
    assert.strictEqual(praiseItem.sentiment, 'Positive', 'Item #2 should be Positive');
    assert.strictEqual(praiseItem.urgency, 'Low', 'Praise should be Low urgency');

    // Grounding verification
    validated.painPoints.forEach((pp) => {
      assert.ok(pp.feedbackIds.length > 0, 'Pain points must reference feedback IDs');
      pp.feedbackIds.forEach((refId) => {
        assert.ok(refId >= 1 && refId <= 10, `Ref ID ${refId} must be valid`);
      });
    });
  });
});
