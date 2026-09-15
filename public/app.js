/**
 * Frontend Application for Customer Feedback Analyzer.
 * Handles user interactions, API requests, deterministic metrics aggregation, and DOM rendering.
 */

// Sample feedback comments (10 items without numbering)
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

// DOM Elements
const feedbackInput = document.getElementById('feedbackInput');
const commentCountEl = document.getElementById('commentCount');
const charCountEl = document.getElementById('charCount');
const btnLoadSample = document.getElementById('btnLoadSample');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnClear = document.getElementById('btnClear');
const errorBanner = document.getElementById('errorBanner');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyState = document.getElementById('emptyState');
const resultsContainer = document.getElementById('resultsContainer');
const modeBadge = document.getElementById('modeBadge');

const totalItemsBadge = document.getElementById('totalItemsBadge');
const sentimentDistribution = document.getElementById('sentimentDistribution');
const urgencyDistribution = document.getElementById('urgencyDistribution');
const themeDistribution = document.getElementById('themeDistribution');
const painPointsList = document.getElementById('painPointsList');
const recommendationsList = document.getElementById('recommendationsList');
const highUrgencyList = document.getElementById('highUrgencyList');
const highUrgencyBadge = document.getElementById('highUrgencyBadge');
const blockersList = document.getElementById('blockersList');
const blockersBadge = document.getElementById('blockersBadge');
const feedbackTableBody = document.getElementById('feedbackTableBody');

// Application State
let currentAnalysisData = null;

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  feedbackInput.addEventListener('input', updateCounters);
  btnLoadSample.addEventListener('click', loadSampleFeedback);
  btnClear.addEventListener('click', clearAll);
  btnAnalyze.addEventListener('click', analyzeFeedback);

  updateCounters();
});

/**
 * Updates comment count and character count indicators.
 */
function updateCounters() {
  const text = feedbackInput.value;
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  
  commentCountEl.textContent = `${lines.length} / 30 comments`;

  // Measure current active line or longest line length
  const rawLines = text.split('\n');
  const maxLineLength = rawLines.reduce((max, l) => Math.max(max, l.length), 0);
  charCountEl.textContent = `${maxLineLength} / 1,000 max chars per line`;

  if (lines.length > 30 || maxLineLength > 1000) {
    commentCountEl.style.color = '#b91c1c';
    charCountEl.style.color = maxLineLength > 1000 ? '#b91c1c' : '';
  } else {
    commentCountEl.style.color = '';
    charCountEl.style.color = '';
  }
}

/**
 * Loads the 10 sample feedback comments into the textarea.
 */
function loadSampleFeedback() {
  feedbackInput.value = SAMPLE_COMMENTS.join('\n');
  hideError();
  updateCounters();
}

/**
 * Clears input and resets application state.
 */
function clearAll() {
  feedbackInput.value = '';
  hideError();
  updateCounters();
  currentAnalysisData = null;
  resultsContainer.classList.add('hidden');
  emptyState.classList.remove('hidden');
}

/**
 * Displays error banner with sanitized message.
 */
function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
}

/**
 * Hides error banner.
 */
function hideError() {
  errorBanner.textContent = '';
  errorBanner.classList.add('hidden');
}

/**
 * Main Analysis Trigger Function.
 */
async function analyzeFeedback() {
  hideError();

  const rawText = feedbackInput.value;
  const cleanComments = rawText.split('\n').map((c) => c.trim()).filter((c) => c.length > 0);

  if (cleanComments.length === 0) {
    showError('Please enter at least one feedback comment before analyzing.');
    return;
  }

  if (cleanComments.length > 30) {
    showError(`Maximum 30 comments allowed per batch (you entered ${cleanComments.length}).`);
    return;
  }

  for (let i = 0; i < cleanComments.length; i++) {
    if (cleanComments[i].length > 1000) {
      showError(`Comment #${i + 1} exceeds the 1,000 character limit.`);
      return;
    }
  }

  // Show loading state, disable buttons
  loadingIndicator.classList.remove('hidden');
  btnAnalyze.disabled = true;
  btnLoadSample.disabled = true;
  btnClear.disabled = true;

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: cleanComments })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to analyze feedback comments.');
    }

    // Success! Render dashboard & results
    currentAnalysisData = data;
    renderResults(data);
  } catch (err) {
    showError(err.message || 'An error occurred during analysis.');
  } finally {
    loadingIndicator.classList.add('hidden');
    btnAnalyze.disabled = false;
    btnLoadSample.disabled = false;
    btnClear.disabled = false;
  }
}

/**
 * Main Rendering Dispatcher.
 */
function renderResults(data) {
  emptyState.classList.add('hidden');
  resultsContainer.classList.remove('hidden');

  // Update Mode Badge
  if (data.mode === 'live') {
    modeBadge.textContent = 'Live AI Mode';
    modeBadge.className = 'mode-badge live-badge';
  } else {
    modeBadge.textContent = 'Simulated AI / Rule-based demo';
    modeBadge.className = 'mode-badge mock-badge';
  }

  const { comments, analysis } = data;
  const items = analysis.items;

  // Map original comments by ID for fast lookup
  const commentMap = {};
  comments.forEach((c) => {
    commentMap[c.id] = c.text;
  });

  // 1. Render Individual Item Classifications Table (Section 2)
  renderFeedbackTable(items, commentMap);

  // 2. Render Deterministic Overview Metrics & Distributions (Section 3)
  renderDeterministicDashboard(items);

  // 3. Render PM Insights & Executive Summary (Section 4)
  renderPMInsights(analysis, commentMap);

  // 4. Render High-Urgency Items (Section 5)
  renderHighUrgencyList(items, commentMap);

  // 5. Render Blockers & Potential Churn Signals (Section 6)
  renderBlockersList(items, commentMap);
}

/**
 * Deterministically aggregates counts by sentiment, urgency, and theme in JS.
 */
function renderDeterministicDashboard(items) {
  const total = items.length;
  totalItemsBadge.textContent = `Total Analyzed: ${total}`;

  // Sentiment counts
  const sentiments = { Positive: 0, Neutral: 0, Negative: 0 };
  // Urgency counts
  const urgencies = { High: 0, Medium: 0, Low: 0 };
  // Theme counts
  const themes = {};

  items.forEach((item) => {
    if (sentiments[item.sentiment] !== undefined) sentiments[item.sentiment]++;
    if (urgencies[item.urgency] !== undefined) urgencies[item.urgency]++;
    themes[item.theme] = (themes[item.theme] || 0) + 1;
  });

  // Render Sentiment Bars
  sentimentDistribution.replaceChildren();
  ['Positive', 'Neutral', 'Negative'].forEach((sentKey) => {
    const count = sentiments[sentKey];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    
    const row = document.createElement('div');
    row.className = 'bar-row';
    
    const labelGroup = document.createElement('div');
    labelGroup.className = 'bar-label-group';
    
    const label = document.createElement('span');
    label.textContent = `${sentKey}: ${count} (${pct}%)`;
    
    labelGroup.appendChild(label);
    
    const track = document.createElement('div');
    track.className = 'bar-track';
    
    const fill = document.createElement('div');
    fill.className = `bar-fill fill-${sentKey.toLowerCase()}`;
    fill.style.width = `${pct}%`;
    
    track.appendChild(fill);
    row.appendChild(labelGroup);
    row.appendChild(track);
    sentimentDistribution.appendChild(row);
  });

  // Render Urgency Bars
  urgencyDistribution.replaceChildren();
  ['High', 'Medium', 'Low'].forEach((urgKey) => {
    const count = urgencies[urgKey];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    
    const row = document.createElement('div');
    row.className = 'bar-row';
    
    const labelGroup = document.createElement('div');
    labelGroup.className = 'bar-label-group';
    
    const label = document.createElement('span');
    label.textContent = `${urgKey}: ${count} (${pct}%)`;
    
    labelGroup.appendChild(label);
    
    const track = document.createElement('div');
    track.className = 'bar-track';
    
    const fill = document.createElement('div');
    fill.className = `bar-fill fill-${urgKey.toLowerCase()}`;
    fill.style.width = `${pct}%`;
    
    track.appendChild(fill);
    row.appendChild(labelGroup);
    row.appendChild(track);
    urgencyDistribution.appendChild(row);
  });

  // Render Theme Grid
  themeDistribution.replaceChildren();
  const sortedThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]);
  sortedThemes.forEach(([themeName, count]) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const pill = document.createElement('div');
    pill.className = 'theme-pill';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = themeName;
    
    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = `${count} (${pct}%)`;
    
    pill.appendChild(nameSpan);
    pill.appendChild(countSpan);
    themeDistribution.appendChild(pill);
  });
}

/**
 * Renders Grounded PM Insights & Recommendations.
 */
function renderPMInsights(analysis, commentMap) {
  // Top Customer Pain Points
  painPointsList.replaceChildren();
  analysis.painPoints.forEach((pp) => {
    const card = document.createElement('div');
    card.className = 'insight-item';

    const title = document.createElement('div');
    title.className = 'insight-title';
    title.textContent = `• ${pp.statement}`;
    card.appendChild(title);

    const refsDiv = document.createElement('div');
    refsDiv.className = 'refs-tags';
    
    const labelSpan = document.createElement('span');
    labelSpan.style.fontSize = '0.75rem';
    labelSpan.style.color = '#64748b';
    labelSpan.textContent = 'Evidence IDs:';
    refsDiv.appendChild(labelSpan);

    pp.feedbackIds.forEach((id) => {
      const tag = document.createElement('span');
      tag.className = 'ref-tag';
      tag.textContent = `#${id}`;
      tag.title = `Click to inspect comment #${id}: "${commentMap[id] || ''}"`;
      tag.addEventListener('click', () => scrollToCommentRow(id));
      refsDiv.appendChild(tag);
    });

    card.appendChild(refsDiv);
    painPointsList.appendChild(card);
  });

  // Recommended Product Improvements in Priority Order
  recommendationsList.replaceChildren();
  // Sort recommendations: High -> Medium -> Low
  const priorityOrder = { High: 1, Medium: 2, Low: 3 };
  const sortedRecs = [...analysis.recommendations].sort(
    (a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
  );

  sortedRecs.forEach((rec) => {
    const card = document.createElement('div');
    card.className = 'insight-item';

    const header = document.createElement('div');
    header.className = 'insight-header';

    const title = document.createElement('div');
    title.className = 'insight-title';
    title.textContent = rec.action;

    const prioBadge = document.createElement('span');
    prioBadge.className = `badge badge-${rec.priority.toLowerCase()}`;
    prioBadge.textContent = `${rec.priority} Priority`;

    header.appendChild(title);
    header.appendChild(prioBadge);
    card.appendChild(header);

    const rationale = document.createElement('div');
    rationale.className = 'insight-rationale';
    rationale.textContent = rec.rationale;
    card.appendChild(rationale);

    const refsDiv = document.createElement('div');
    refsDiv.className = 'refs-tags';

    const labelSpan = document.createElement('span');
    labelSpan.style.fontSize = '0.75rem';
    labelSpan.style.color = '#64748b';
    labelSpan.textContent = 'Grounded Feedback IDs:';
    refsDiv.appendChild(labelSpan);

    rec.feedbackIds.forEach((id) => {
      const tag = document.createElement('span');
      tag.className = 'ref-tag';
      tag.textContent = `#${id}`;
      tag.title = `Click to inspect comment #${id}: "${commentMap[id] || ''}"`;
      tag.addEventListener('click', () => scrollToCommentRow(id));
      refsDiv.appendChild(tag);
    });

    card.appendChild(refsDiv);
    recommendationsList.appendChild(card);
  });
}

/**
 * Renders High-Urgency Feedback Section.
 */
function renderHighUrgencyList(items, commentMap) {
  highUrgencyList.replaceChildren();
  const highUrgentItems = items.filter((item) => item.urgency === 'High');

  highUrgencyBadge.textContent = `${highUrgentItems.length} High Urgency`;

  if (highUrgentItems.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.color = '#64748b';
    emptyMsg.style.fontSize = '0.9rem';
    emptyMsg.textContent = '✅ No high-urgency feedback items detected in this batch.';
    highUrgencyList.appendChild(emptyMsg);
    return;
  }

  highUrgentItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'problem-card';

    const header = document.createElement('div');
    header.className = 'problem-header';

    const idSpan = document.createElement('span');
    idSpan.className = 'problem-id';
    idSpan.textContent = `Feedback #${item.id} [${item.theme}]`;

    const urgBadge = document.createElement('span');
    urgBadge.className = 'badge badge-high';
    urgBadge.textContent = 'High Urgency';

    header.appendChild(idSpan);
    header.appendChild(urgBadge);
    card.appendChild(header);

    const textP = document.createElement('p');
    textP.className = 'problem-text';
    textP.textContent = `"${commentMap[item.id] || ''}"`;
    card.appendChild(textP);

    const reasonP = document.createElement('p');
    reasonP.className = 'problem-reason';
    reasonP.textContent = `Reason: ${item.reason}`;
    card.appendChild(reasonP);

    highUrgencyList.appendChild(card);
  });
}

/**
 * Renders Blockers & Churn Signals Section.
 */
function renderBlockersList(items, commentMap) {
  blockersList.replaceChildren();
  const blockerItems = items.filter((item) => item.signal && item.signal !== 'None');

  blockersBadge.textContent = `${blockerItems.length} Blockers / Signals`;

  if (blockerItems.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.color = '#64748b';
    emptyMsg.style.fontSize = '0.9rem';
    emptyMsg.textContent = '✅ No rollout blockers, workflow blockers, or churn signals detected.';
    blockersList.appendChild(emptyMsg);
    return;
  }

  blockerItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'problem-card warning-border';

    const header = document.createElement('div');
    header.className = 'problem-header';

    const idSpan = document.createElement('span');
    idSpan.className = 'problem-id';
    idSpan.textContent = `Feedback #${item.id} [${item.theme}]`;

    const signalBadge = document.createElement('span');
    signalBadge.className = item.signal === 'Potential churn' ? 'badge badge-churn' : 'badge badge-signal';
    signalBadge.textContent = item.signal;

    header.appendChild(idSpan);
    header.appendChild(signalBadge);
    card.appendChild(header);

    const textP = document.createElement('p');
    textP.className = 'problem-text';
    textP.textContent = `"${commentMap[item.id] || ''}"`;
    card.appendChild(textP);

    const reasonP = document.createElement('p');
    reasonP.className = 'problem-reason';
    reasonP.textContent = `Evidence / Explanation: ${item.reason}`;
    card.appendChild(reasonP);

    blockersList.appendChild(card);
  });
}

/**
 * Renders Individual Classification Table.
 */
function renderFeedbackTable(items, commentMap) {
  feedbackTableBody.replaceChildren();

  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.id = `row-feedback-${item.id}`;

    // ID
    const tdId = document.createElement('td');
    tdId.style.fontWeight = '700';
    tdId.textContent = `#${item.id}`;
    tr.appendChild(tdId);

    // Comment
    const tdComment = document.createElement('td');
    tdComment.className = 'comment-cell';
    tdComment.textContent = commentMap[item.id] || '';
    tr.appendChild(tdComment);

    // Theme
    const tdTheme = document.createElement('td');
    tdTheme.textContent = item.theme;
    tr.appendChild(tdTheme);

    // Sentiment
    const tdSent = document.createElement('td');
    const sentBadge = document.createElement('span');
    sentBadge.className = `badge badge-${item.sentiment.toLowerCase()}`;
    sentBadge.textContent = item.sentiment;
    tdSent.appendChild(sentBadge);
    tr.appendChild(tdSent);

    // Urgency
    const tdUrg = document.createElement('td');
    const urgBadge = document.createElement('span');
    urgBadge.className = `badge badge-${item.urgency.toLowerCase()}`;
    urgBadge.textContent = item.urgency;
    tdUrg.appendChild(urgBadge);
    tr.appendChild(tdUrg);

    // Signal
    const tdSig = document.createElement('td');
    if (item.signal && item.signal !== 'None') {
      const sigBadge = document.createElement('span');
      sigBadge.className = item.signal === 'Potential churn' ? 'badge badge-churn' : 'badge badge-signal';
      sigBadge.textContent = item.signal;
      tdSig.appendChild(sigBadge);
    } else {
      tdSig.textContent = '-';
    }
    tr.appendChild(tdSig);

    // Reason
    const tdReason = document.createElement('td');
    tdReason.textContent = item.reason;
    tr.appendChild(tdReason);

    feedbackTableBody.appendChild(tr);
  });
}

/**
 * Smoothly scrolls to a specific feedback table row and highlights it briefly.
 */
function scrollToCommentRow(id) {
  const row = document.getElementById(`row-feedback-${id}`);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.style.transition = 'background-color 0.3s ease';
    row.style.backgroundColor = '#fef3c7';
    setTimeout(() => {
      row.style.backgroundColor = '';
    }, 2000);
  }
}
