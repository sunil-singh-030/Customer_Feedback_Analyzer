# Technical & Product Decisions (DECISIONS.md)

This document details the architectural choices, product trade-offs, data model decisions, and scope boundaries made while building the **Customer Feedback Analyzer**.

---

## 1. Scope & Strategy Under a 4-Hour Time Limit

To deliver a working, robust prototype within the 4-hour assessment window, development prioritized:
1. **Core Working Functionality**: Reliable end-to-end feedback analysis flow.
2. **Deterministic Grounding**: Strict mathematical accuracy for counts combined with grounded AI insights.
3. **Clean Usability**: A single-page application requiring zero complex setup.
4. **Verifiable Quality**: Automated unit tests for input/output validation and offline fallback capability.

Features such as database persistence, user authentication, multi-tenant workspace management, file uploads, and heavy framework setups were intentionally excluded to focus on code quality, validation safety, and thorough documentation.

---

## 2. Architecture & Technology Stack Choices

### Why Vanilla HTML5 / CSS3 / JavaScript?
- **Zero Build Step Overhead**: No Webpack, Vite, Babel, or compilation pipeline required. The application runs immediately upon `node server.js`.
- **Transparency**: Code logic is easily inspectable without multi-file framework abstractions.
- **Performance**: Instant browser loading with minimal memory footprint.

### Why Node.js & Express Backend?
- **Single Command Execution**: Express serves both static frontend assets (`public/`) and REST endpoints (`/api/analyze`), enabling same-origin requests (`http://localhost:3000`) without CORS configuration or multi-process orchestrators.
- **Server-Side Security**: API keys (`AI_API_KEY`) remain strictly on the backend and are never exposed to browser client scripts.

---

## 3. Data Model & In-Memory Session Design

- **Stateless Batch Request**: Each analysis submission is processed as an independent batch.
- **Sequential Numeric IDs**: Input comments are assigned 1-indexed sequential integers (`1, 2, 3...`) on the backend. Original comment text is preserved in memory and matched against classifications by ID.
- **In-Memory Session Storage**: Results reside in browser DOM memory. Page refreshes clear the state.
  - *Trade-off*: Simple and privacy-friendly, but does not support historical analysis comparison across sessions.

---

## 4. Division of Responsibilities: AI vs. Deterministic Code

A core architectural decision was **never to ask the AI model to calculate totals, counts, or percentages**.

| Task | Responsibility | Rationale |
| :--- | :--- | :--- |
| **Language Understanding** | AI Model / Mock Analyzer | LLMs excel at nuanced text classification, sentiment detection, and extracting key themes. |
| **Categorization Reasons** | AI Model / Mock Analyzer | Providing human-readable explanations for why a comment was categorized. |
| **Dashboard Metrics & Totals** | JavaScript Code | Guaranteed 100% mathematical accuracy. Prevents hallucinated totals or mismatched sums. |
| **Theme Frequency Ranking** | JavaScript Code | Exact sorting and percentage calculations without LLM estimation. |
| **Grounding & Reference Check** | JavaScript Validation | Ensures every AI pain point or recommendation references valid input IDs. |

---

## 5. Classification Policy & Priority Assumptions

### Theme Taxonomy
Comments are assigned **one primary theme** from: `Performance`, `Usability`, `Authentication`, `Reporting`, `Search`, `Pricing`, `Onboarding`, `Other`. If multiple themes apply, the dominant actionable theme is selected, with ambiguity noted in the reason string.

### Sentiment Criteria
- **Positive**: Explicit praise, delight, or efficiency gains (e.g. *"saves time"*).
- **Negative**: Reported errors, confusion, slow performance, or broken features.
- **Neutral**: Observations or feature requests lacking strong emotion (e.g. *"We need SSO support..."*).

### Urgency & Blocker Rules
- **High Urgency**: Core workflow broken (e.g. invite emails missing) or explicit deployment prerequisite (e.g. SSO support).
- **Medium Urgency**: Usability friction or performance latency without total workflow stoppage.
- **Low Urgency**: Positive praise or non-blocking suggestions.

### Potential Churn Signal Policy
- **Strict Evidence Requirement**: `Potential churn` is assigned **only** when feedback contains explicit wording about cancelling, leaving, or migrating to a competitor. General dissatisfaction is **never** labeled as churn.

---

## 6. Intentionally Skipped Features & Future Improvements

### Intentionally Skipped (Out of Scope)
- **Database Persistence**: Avoided PostgreSQL/MongoDB setup to keep the prototype lightweight.
- **CSV/Excel File Upload**: Pasting comments directly fulfills the requirement without complex file parsing dependencies.
- **Chart Libraries (Chart.js, D3)**: Modern flexbox CSS bars provide clean, zero-dependency data visualization.
- **Multi-step AI Agents / RAG**: Single batch completions avoid latency and complexity.

### Future Improvements (With More Time)
1. **Export Capabilities**: CSV/PDF export of PM insights and table results.
2. **Historical Trend Analysis**: Persistent storage to track sentiment and theme shifts over sprint cycles.
3. **Custom Taxonomy Config**: Allowing PMs to define custom theme categories per product area.
