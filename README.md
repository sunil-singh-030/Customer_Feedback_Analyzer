# Customer Feedback Analyzer

A lightweight, single-command **Customer Feedback Analyzer** built for the Zscaler AI Product Builder Assessment.

This web application helps product managers ingest customer feedback, detect themes, analyze sentiment and urgency, identify rollout and workflow blockers, and generate grounded priority recommendations for product roadmaps.

---

## Key Features

1. **Flexible Feedback Input**:
   - Accepts multi-line customer feedback (one comment per line).
   - Validates input limits: maximum 30 comments, up to 1,000 characters per line.
   - Preserves duplicate comments as separate entries.
   - Includes a **"Load Sample Feedback"** button populating 10 realistic customer comments.

2. **Deterministic Dashboard & Distribution**:
   - Total feedback count.
   - **Counts & Percentages by Theme**: Performance, Usability, Authentication, Reporting, Search, Pricing, Onboarding, Other.
   - **Counts & Percentages by Sentiment**: Positive (green badge), Neutral (gray badge), Negative (red badge).
   - **Counts & Percentages by Urgency**: High, Medium, Low.
   - *Note:* All counts, percentages, and totals are calculated deterministically in JavaScript to guarantee mathematical accuracy.

3. **High-Urgency & Blocker Identification**:
   - **High-Urgency Section**: Highlights critical issues interrupting user workflows.
   - **Rollout & Workflow Blockers**: Isolates enterprise deployment prerequisites (e.g. SSO support) and broken features (e.g. missing invite emails).
   - **Explicit Churn Signals**: Identifies explicit statements about leaving or cancelling without falsely labeling general dissatisfaction as churn.

4. **Grounded PM Insight Summary**:
   - **Top Customer Pain Points**: Summarized friction statements linked directly to original feedback IDs.
   - **Prioritized Product Improvements**: Actionable recommendations categorized by High, Medium, and Low priority with rationale and clickable feedback ID tags.

5. **Dual Analysis Engine (Live AI & Mock Demo)**:
   - **Live AI Mode**: Single OpenAI-compatible Chat Completions API batch request with strict JSON schema enforcement and a 45-second timeout.
   - **Simulated AI / Rule-Based Mock Mode**: Fully offline dynamic heuristic analyzer when credentials are not configured.

---

## Technology Stack

- **Frontend**: Standard HTML5, Plain CSS3 (Responsive, modern flexbox/grid layout), Vanilla JavaScript (ES6+).
- **Backend**: Node.js with Express.
- **AI Integration**: OpenAI-compatible REST API via native Node.js `fetch`.
- **Environment**: `dotenv` for configuration.
- **Testing**: Node.js built-in test runner (`node:test` and `node:assert`).
- **No Heavy Frameworks**: Built without React, Next.js, Vue, Tailwind, Bootstrap, LangChain, RAG, or databases.

---

## Local Setup & Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended).
- **npm**: v9.0.0 or higher.

### 1. Installation
Clone or navigate to the project root directory and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
Default configuration (Mock Mode):
```env
PORT=3000
AI_MODE=mock
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

To run in **Live AI Mode**, update `.env`:
```env
AI_MODE=live
AI_API_KEY=your_actual_openai_api_key
```

### 3. Run the Application
Start the Express server:
```bash
npm start
```
Open your browser and navigate to:
```
http://localhost:3000
```

---

## Input Limits & Session Storage

- **Max Comments**: 30 non-empty comments per batch.
- **Max Characters**: 1,000 characters per line.
- **Session Memory**: All feedback and analysis results are held in browser/server memory for the current session. Refreshing the page clears the results.

---

## Testing & Verification

Run the automated test suite using Node's built-in test runner:
```bash
npm test
```

### Actual Verification Results:
- **Total Tests**: 10
- **Suites**: 3 (Input Validation, Output Schema Validation, Mock Analyzer Logic & Determinism)
- **Status**: 10 passed, 0 failed.

---

## Project Structure

```
feedback-analyzer/
├── public/
│   ├── index.html        # Main HTML5 layout & assessment sections
│   ├── style.css         # Modern plain CSS with responsive layout & accessible badges
│   └── app.js            # Client-side input validation, API fetch & deterministic rendering
├── services/
│   ├── aiService.js      # OpenAI API integration with 45s timeout & prompt safeguards
│   └── mockAnalyzer.js   # Offline rule-based heuristic fallback analyzer
├── utils/
│   └── validation.js     # Request payload and AI schema validator
├── tests/
│   └── validation.test.js# Automated unit tests using node:test
├── server.js             # Express server & POST /api/analyze endpoint
├── package.json          # Node project manifest and scripts
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore rules
├── README.md             # Overview, setup, and instructions
├── DECISIONS.md          # Technical decisions and product trade-offs
├── AI_USAGE.md           # AI tools usage log and verification details
└── ARCHITECTURE.md       # Architecture diagram and system flow explanation
```
