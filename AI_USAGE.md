# AI Usage & Verification Log (AI_USAGE.md)

This document records how AI tools were utilized during the design, development, and testing of the **Customer Feedback Analyzer**, including prompts used, observations, corrections made, and verification methodologies.

---

## 1. AI Tools Used During Development
- **Primary Development Assistant**: Antigravity AI Agent (powered by Gemini 3.6 Flash model).
- **Runtime AI Provider**: OpenAI-compatible REST API (`gpt-4o-mini` / configurable via `.env`).
- For **overview, suggestions, writing detailed prompt for Antigravity** I used **ChatGPT**.

---

## 2. Representative Prompts & Tasks Executed

### Task 1: Express Server & Validation Logic
> *"Generate a lightweight Express endpoint POST /api/analyze that validates an array of string comments (max 30 items, max 1000 chars per line), assigns sequential numeric IDs, calls an AI service or mock service, and enforces strict schema validation."*

### Task 2: Grounded JSON Schema & System Prompt Safeguards
> *"Design a system prompt for feedback classification. Protect against prompt injection by treating comments as untrusted data. Require structured JSON output containing items, painPoints, and recommendations, with all pain points referencing original feedback IDs."*



---

## 3. Where AI Assistance Helped

1. **Rapid Scaffolding**: Fast generation of boilerplate Express route handling, CSS styling, and HTML structure.
2. **Schema & Validation Edge Cases**: Designing comprehensive checks in `utils/validation.js` to catch duplicate IDs, out-of-bound enums, and dangling references.
3. **Mock Heuristic Logic**: Structuring `services/mockAnalyzer.js` to provide realistic, dynamic analysis when credentials are absent.

---

## 4. Observed Errors, Vague Suggestions & Applied Corrections



| Observed Issue | Root Cause | Applied Correction |
| :--- | :--- | :--- |
| **Wrong chronological order of sections** | Ordering was incorrect in given prompt | I provide correct ordering of sections. |
| **Tool Path Error during file creation** | Attempted to pass `ArtifactMetadata` to project source code files (`package.json`). | Corrected tool call parameters by omitting `ArtifactMetadata` for standard workspace project files. |
| **Risk of Unverified AI Counts** | Initial prompt structure allowed AI to return total counts for dashboard cards. | Restructured pipeline so AI returns *only* item classifications; JavaScript computes all counts, percentages, and theme totals deterministically. |
| **Silent API Fallback Risk** | Common recommendation was to silently switch to mock mode if live AI failed. | Enforced prompt policy: If `AI_MODE=live` and the API call fails or times out, return a clear error message to the user rather than hiding the failure behind mock data. |

---

## 5. Verification & Quality Assurance

All AI-generated code and system outputs were verified using a 3-layer validation strategy:

1. **Gave confusing comments to test correctness**:
   - Generated 10 feedback comments for **ZSCALER's Zero Trust Exchange plaform**.
   - Like positive and negative words in same comment. **("not bad","saves time but")**.
   - Than pasted these comments to check correctness and accuracy of logic used.

2. **Schema Integrity Enforcement (`validateAnalysisOutput`)**:
   - Programmatically verifies that every input comment ID (1 to N) is present exactly once.
   - Verifies that all theme, sentiment, urgency, and signal labels belong to allowed enum sets.
   - Ensures all pain point and recommendation reference IDs exist in the input set.

3. **Manual UI Verification**:
   - Tested loading sample data (10 items without numbers).
   - Verified that dashboard sums equal total items (10 = 10 themes = 10 sentiments = 10 urgencies).
   - Verified that Item #7 (SSO) displays as High Urgency and Rollout Blocker.
   - Verified that Item #3 (Invite Email) displays as High Urgency and Workflow Blocker.
   - Verified XSS safety by inputting HTML tag strings (`<script>alert(1)</script>`) and confirming safe DOM rendering via `textContent`.

---

## 6. AI Risks & Mitigation Strategies

- **Risk of Hallucinated Claims**: Mitigated by forcing every pain point and recommendation to reference valid feedback IDs.
- **Risk of Prompt Injection**: Mitigated by clearly separating system analysis rules from user feedback data in `aiService.js`, treating comments as untrusted data strings.
- **Risk of Mathematical Inconsistency**: Mitigated by delegating all counting and percentage math to client-side JavaScript.

---

