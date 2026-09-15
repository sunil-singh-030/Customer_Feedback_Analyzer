/**
 * Mock Analyzer Service for Customer Feedback Analyzer.
 * Dynamic rule-based analyzer used when AI_MODE=mock or credentials are absent.
 */

/**
 * Analyzes a list of comments using deterministic rule-based heuristics.
 * @param {string[]} comments - Clean array of feedback comments.
 * @returns {Promise<object>} Structured analysis object { items, painPoints, recommendations }.
 */
async function analyzeFeedbackMock(comments) {
  const items = comments.map((comment, idx) => {
    const id = idx + 1;
    const lower = comment.toLowerCase();

    // 1. Determine Theme
    let theme = 'Other';
    if (lower.includes('sso') || lower.includes('invite') || lower.includes('email') || lower.includes('auth') || lower.includes('login')) {
      theme = 'Authentication';
    } else if (lower.includes('search') || lower.includes('keyword')) {
      theme = 'Search';
    } else if (lower.includes('pricing') || lower.includes('price') || lower.includes('cost')) {
      theme = 'Pricing';
    } else if (lower.includes('onboarding') || lower.includes('setup')) {
      theme = 'Onboarding';
    } else if (lower.includes('report') || lower.includes('reports') || lower.includes('export')) {
      theme = 'Reporting';
    } else if (lower.includes('slow') || lower.includes('load') || lower.includes('speed') || lower.includes('latency')) {
      theme = 'Performance';
    } else if (lower.includes('layout') || lower.includes('mobile') || lower.includes('confusing') || lower.includes('ui')) {
      theme = 'Usability';
    } else {
      theme = 'Usability';
    }

    // 2. Determine Sentiment
    let sentiment = 'Neutral';
    const hasPositive = /love|helpful|saves|great|excellent|useful|powerful/i.test(comment);
    const hasNegative = /cannot|never|confusing|breaks|too long|too complex|not relevant|fail|slow/i.test(comment);

    if (hasPositive && !hasNegative) {
      sentiment = 'Positive';
    } else if (hasNegative) {
      sentiment = 'Negative';
    } else {
      sentiment = 'Neutral';
    }

    // 3. Determine Urgency & Signals
    let urgency = 'Low';
    let signal = 'None';
    let reason = 'General feedback observation.';

    if (lower.includes('sso') || lower.includes('company-wide') || lower.includes('roll this out')) {
      urgency = 'High';
      signal = 'Rollout blocker';
      reason = 'Identified as a deployment prerequisite for enterprise company-wide rollout.';
    } else if (lower.includes('cannot') || lower.includes('never arrives') || lower.includes('breaks')) {
      urgency = 'High';
      signal = 'Workflow blocker';
      reason = 'Core user workflow is interrupted or malfunctioning.';
    } else if (lower.includes('cancel') || lower.includes('leaving') || lower.includes('switch to')) {
      urgency = 'High';
      signal = 'Potential churn';
      reason = 'User explicitly mentions risk of cancellation or switching providers.';
    } else if (hasNegative || lower.includes('slow') || lower.includes('confusing') || lower.includes('complex')) {
      urgency = 'Medium';
      reason = 'User reported usability or performance friction without total workflow breakage.';
    } else if (sentiment === 'Positive') {
      urgency = 'Low';
      reason = 'Positive user praise highlighting beneficial features.';
    } else {
      urgency = 'Low';
      reason = 'Non-blocking feature request or suggestion.';
    }

    return {
      id,
      theme,
      sentiment,
      urgency,
      reason,
      signal
    };
  });

  // Collect pain points from High/Medium negative items
  const painPoints = [];
  const highMediumNegative = items.filter(
    (item) => item.urgency === 'High' || (item.urgency === 'Medium' && item.sentiment === 'Negative')
  );

  // Group by theme for grounded pain points
  const themeMap = {};
  highMediumNegative.forEach((item) => {
    if (!themeMap[item.theme]) themeMap[item.theme] = [];
    themeMap[item.theme].push(item.id);
  });

  Object.entries(themeMap).forEach(([themeName, ids]) => {
    painPoints.push({
      statement: `Users experience significant issues with ${themeName.toLowerCase()}.`,
      feedbackIds: ids
    });
  });

  if (painPoints.length === 0) {
    painPoints.push({
      statement: 'No critical user friction points detected in the analyzed set.',
      feedbackIds: [1]
    });
  }

  // Generate grounded recommendations
  const recommendations = [];

  // Check for SSO / Rollout blocker
  const rolloutBlockers = items.filter((i) => i.signal === 'Rollout blocker');
  if (rolloutBlockers.length > 0) {
    recommendations.push({
      action: 'Implement Single Sign-On (SSO) Support',
      priority: 'High',
      rationale: 'Required to unblock enterprise deployment and company-wide adoption.',
      feedbackIds: rolloutBlockers.map((i) => i.id)
    });
  }

  // Check for Workflow blockers
  const workflowBlockers = items.filter((i) => i.signal === 'Workflow blocker');
  if (workflowBlockers.length > 0) {
    recommendations.push({
      action: 'Fix Critical Workflow Failures & Delivery Systems',
      priority: 'High',
      rationale: 'Address core functionality failures preventing key user tasks like invitations or report viewing.',
      feedbackIds: workflowBlockers.map((i) => i.id)
    });
  }

  // Check for Performance issues
  const perfItems = items.filter((i) => i.theme === 'Performance' && i.sentiment === 'Negative');
  if (perfItems.length > 0) {
    recommendations.push({
      action: 'Optimize Filtering and Rendering Latency',
      priority: 'Medium',
      rationale: 'Reduce page load time and improve responsiveness when filtering datasets.',
      feedbackIds: perfItems.map((i) => i.id)
    });
  }

  // Check for Usability / Setup complexity
  const setupItems = items.filter((i) => i.theme === 'Onboarding' || i.theme === 'Pricing' || i.theme === 'Usability');
  const negSetup = setupItems.filter((i) => i.sentiment === 'Negative');
  if (negSetup.length > 0) {
    recommendations.push({
      action: 'Simplify Setup & Pricing Clarity',
      priority: 'Medium',
      rationale: 'Streamline onboarding workflows and clarify included features on pricing pages.',
      feedbackIds: negSetup.map((i) => i.id)
    });
  }

  // Fallback recommendation if empty
  if (recommendations.length === 0) {
    recommendations.push({
      action: 'Continue Monitoring Customer Feedback',
      priority: 'Low',
      rationale: 'Current feedback consists primarily of praise and low-urgency suggestions.',
      feedbackIds: [1]
    });
  }

  return {
    items,
    painPoints,
    recommendations
  };
}

module.exports = {
  analyzeFeedbackMock
};
