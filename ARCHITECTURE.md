# System Architecture & Workflow (ARCHITECTURE.md)

This document describes the architectural flow, component responsibilities, data pipeline, safety controls, and grounding mechanisms of the **Customer Feedback Analyzer**.

---

## 1. High-Level Architecture Diagram

```
 +-----------------------------------------------------------------------------------+
 |                                BROWSER (CLIENT)                                   |
 |                                                                                   |
 |  [User Input]  --->  [app.js: validateInput()]  --->  POST /api/analyze           |
 |                              ^                                |                   |
 |                              |                                v                   |
 |  [Render UI]   <---  [app.js: aggregateMetrics()]  <---  [JSON Response]          |
 +---------------------------------------------------------------+-------------------+
                                                                 |
                                                                 v
 +-----------------------------------------------------------------------------------+
 |                              EXPRESS BACKEND (SERVER)                             |
 |                                                                                   |
 |  server.js (Route Handler)                                                        |
 |     │                                                                             |
 |     ├──> validation.js: validateInputComments()                                   |
 |     │                                                                             |
 |     ├──> If AI_MODE == "live":                                                    |
 |     │       aiService.js  --->  [Fetch API (45s Timeout)] ---> OpenAI / LLM       |
 |     │                                                                             |
 |     ├──> If AI_MODE == "mock":                                                    |
 |     │       mockAnalyzer.js  ---> [Rule-Based Heuristics Engine]                  |
 |     │                                                                             |
 |     └──> validation.js: validateAnalysisOutput()                                  |
 +-----------------------------------------------------------------------------------+
```

---

## 2. File Responsibilities

| File Path | Role & Primary Responsibility |
| :--- | :--- |
| **`server.js`** | Express application entry point. Serves static files from `public/`, configures body parsing, exposes `POST /api/analyze`, routes to AI or Mock service, and manages top-level error handling. |
| **`public/app.js`** | Frontend application script. Handles user events, input counters, sample data loading, API requests, deterministic metrics calculation (counts/percentages), and XSS-safe DOM rendering. |
| **`public/index.html`** | HTML5 interface structure containing input controls, assessment answer sections (Q1-Q7), dashboard cards, and individual feedback classification table. |
| **`public/style.css`** | Plain CSS styling rules defining clean light theme, accessible sentiment badges, visual distribution bars, and responsive layout. |
| **`services/aiService.js`** | Constructs structured prompt with anti-injection safeguards, calls OpenAI-compatible Chat Completions API using native `fetch` with a 45s `AbortController` timeout, and parses JSON output. |
| **`services/mockAnalyzer.js`** | Offline heuristic engine. Evaluates feedback comments dynamically using keyword rules to determine theme, sentiment, urgency, signals, pain points, and recommendations. |
| **`utils/validation.js`** | Central validation library. Sanitizes input comment arrays and performs schema/integrity verification on AI and Mock output objects. |
| **`tests/validation.test.js`** | Unit test suite using Node's built-in test runner (`node:test`) verifying validation functions, boundary checks, and mock analyzer determinism. |

---

## 3. Detailed Execution & Data Flow

1. **User Action**: The user enters or pastes feedback comments into the textarea (or clicks "Load Sample Feedback") and clicks **"Analyze Feedback"**.
2. **Client Validation (`public/app.js`)**:
   - Trims whitespace and strips empty lines.
   - Verifies comment count (1 to 30) and character limits (1,000 max per line).
   - Shows loading spinner and disables buttons.
3. **HTTP POST Request**: Sends `{ comments: string[] }` to `/api/analyze`.
4. **Backend Ingestion (`server.js`)**:
   - Passes comments through `validateInputComments()`.
   - Assigns 1-indexed numeric IDs (`1..N`).
5. **Analysis Dispatch**:
   - Checks `process.env.AI_MODE`.
   - If `live`: Calls `analyzeFeedbackAI(cleanComments)` in `aiService.js`.
   - If `mock`: Calls `analyzeFeedbackMock(cleanComments)` in `mockAnalyzer.js`.
6. **Schema Validation (`utils/validation.js`)**:
   - Calls `validateAnalysisOutput(result, N)`.
   - Verifies ID coverage (`1..N`), allowed enum values, non-empty text strings, and reference integrity.
7. **HTTP Response**: Returns `{ success: true, mode: "live"|"mock", comments: [...], analysis: {...} }`.
8. **Client Deterministic Aggregation & Rendering (`public/app.js`)**:
   - Calculates exact counts and percentages for themes, sentiments, and urgencies in JavaScript.
   - Renders PM insights, high-urgency items, blockers/signals, and classification table safely via `textContent`.

---

## 4. Grounding Controls & Unsupported Answer Reduction

This system is a **bounded AI analysis workflow**, NOT an autonomous agent.

To eliminate hallucinations and prevent unsupported answers:
- **Strict Single-Batch Structured Output**: The AI is constrained to a predefined JSON schema.
- **Reference Tagging**: Every pain point and product recommendation MUST explicitly list the numeric IDs of supporting feedback items.
- **Client-Side Grounding Verification**: The client app verifies that all referenced IDs exist and provides interactive tags (`#1`, `#7`) that scroll to and highlight the original comment.
- **Strict Churn Policy**: `Potential churn` signals are assigned only when explicit cancellation wording is present in the feedback text.
- **Deterministic Metrics**: All numerical dashboard counts are computed by code, preventing LLM arithmetic errors.

---

## 5. Human Review & Known Boundaries

While schema validation and grounding tags reduce hallucinations, AI classifications remain probabilistic.
- **PM Review Required**: Recommended product improvements represent suggestions for PM review, not definitive business decisions.
- **Context Limitations**: AI cannot infer customer ARR, enterprise contract size, or unstated business priorities.
