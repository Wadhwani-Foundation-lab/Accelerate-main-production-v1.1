# V2 — Panel Interview Insights Prompt

## Purpose

Generate a deep-dive AI-powered briefing for the interview panel evaluating ventures on the Wadhwani Accelerate platform. The venture has already been screened and assigned a program tier by the Screening Manager. This prompt helps panelists probe **gaps**, **revenue assumptions**, and **growth opportunity** before making the final accept/reject decision.

**Source:** `backend/src/services/aiService.ts` → `buildInsightsPrompt()`

---

## Implementation Details

| Parameter | Value |
|-----------|-------|
| **AI Provider** | Anthropic (Claude) |
| **Model** | `claude-sonnet-4-5-20250929` |
| **Max Tokens** | 2,500 |
| **Temperature** | 0.7 |
| **API Endpoint** | `POST /api/ventures/:id/generate-insights?type=panel` |
| **Allowed Roles** | `success_mgr`, `venture_mgr`, `committee_member`, `admin` |
| **Estimated Cost** | ~$0.03-0.05 per generation |

---

## When Used

Triggered when a panel member clicks **"Generate Panel Insights"** before or during the interview stage. The venture has already been screened and assigned a tier by the Screening Manager. This prompt produces a deep-dive analysis to help the panel probe gaps, validate revenue claims, and evaluate the growth opportunity before making the final accept/reject decision.

---

## Input Data

The prompt is constructed from `VentureData` interface + VSM notes + panel notes + prior screening insights:

```typescript
interface VentureData {
    id: string;
    name: string;
    founder_name?: string;
    revenue_12m?: number;
    revenue_potential_3y?: number;
    full_time_employees?: number;
    growth_focus?: string;
    growth_current?: any;            // JSONB - current product/segment/geography
    growth_target?: any;             // JSONB - target product/segment/geography
    commitment?: any;                // JSONB
    vsm_notes?: string;
    panel_notes?: string;
    screening_recommendation?: string; // Tier assigned during V1 screening
    prior_ai_analysis?: object;        // V1 screening insights (if available)
    corporate_presentation_text?: string;  // Extracted from uploaded PDF/PPT
}
```

**Corporate Presentation:** If the venture has uploaded a corporate presentation, the text is extracted via `documentService.extractDocumentText()` and included in the prompt (truncated at 8,000 characters).

**Prior Screening Insights:** The V1 screening insights (if previously generated) are passed into the prompt so the panel analysis can build on — rather than repeat — the initial screening.

---

## Prompt Template

```
You are a senior venture evaluation analyst preparing a deep-dive briefing for the interview panel of the Accelerate Assisted Growth Platform. The venture has already passed initial screening and been assigned a program tier. Your role is to help the panel conduct a thorough, evidence-based interview that probes the three critical evaluation dimensions:

1. **Gaps** — What are the venture's capability, strategic, and execution gaps? How addressable are they through the Accelerate program?
2. **Revenue** — How credible are the revenue assumptions? What are the unit economics, growth drivers, and risks to the financial trajectory?
3. **Growth Opportunity** — How large and defensible is the market opportunity? Does the venture have a realistic path to capture it?

You will receive:
- The full venture application (business details, growth idea, support areas, support description)
- The screening manager's tier recommendation and notes from initial review
- Panel member notes (optional pre-interview observations)
- Corporate presentation (optional attachment)
- Any prior AI screening insights generated during the screening stage

**Venture Information:**
- Company Name: ${ventureData.name}
- Founder: ${ventureData.founder_name || 'N/A'}
- Current Revenue (12M): ₹${ventureData.revenue_12m?.toLocaleString() || 'N/A'}
- Target Revenue (3Y): ₹${ventureData.revenue_potential_3y?.toLocaleString() || 'N/A'}
- Full-Time Employees: ${ventureData.full_time_employees || 'N/A'}
- Growth Focus: ${ventureData.growth_focus || 'N/A'}
- Current Market: ${JSON.stringify(ventureData.growth_current || {})}
- Target Market: ${JSON.stringify(ventureData.growth_target || {})}
- Screening Tier: ${ventureData.screening_recommendation || 'N/A'}

**Screening Manager's Notes:**
${vsmNotes || 'No screening notes provided.'}

**Panel Member's Notes:**
${panelNotes || 'No panel notes provided.'}

**Corporate Presentation Content:**
${ventureData.corporate_presentation_text?.slice(0, 8000) || 'No corporate presentation provided.'}
[... truncated ...]

**Prior Screening Insights (if available):**
${JSON.stringify(ventureData.prior_ai_analysis || 'No prior AI insights available.')}

Based on all available data, generate a deep-dive panel briefing.

**Your Task:**
Provide a comprehensive panel interview briefing in the following JSON format:

{
  "panel_recommendation": "<One of: Accept, Accept with Conditions, Defer, or Reject>",
  "executive_summary": "<3-4 sentence summary covering the venture's core proposition, key strength, and primary concern>",
  "market_context": "<2-3 sentences on the sector landscape, competitive dynamics, and market timing>",
  "gap_deep_dive": {
    "critical_gaps": [
      "<Critical gap 1 — a gap that could prevent success if unaddressed>",
      "<Critical gap 2>",
      "<Critical gap 3>"
    ],
    "addressable_gaps": [
      "<Addressable gap 1 — a gap that Accelerate's support can realistically close>",
      "<Addressable gap 2>",
      "<Addressable gap 3>"
    ],
    "gap_summary": "<1-2 sentences on overall gap severity and whether Accelerate can bridge them>"
  },
  "revenue_deep_dive": {
    "current_health": "<1-2 sentences on current revenue quality — recurring vs. one-time, customer concentration, margin profile>",
    "projection_credibility": "<1-2 sentences evaluating the 3-year target — what growth rate is implied, is it achievable given the model?>",
    "key_revenue_risks": [
      "<Revenue risk 1>",
      "<Revenue risk 2>",
      "<Revenue risk 3>"
    ],
    "revenue_summary": "<1-2 sentences on overall revenue outlook>"
  },
  "growth_opportunity_deep_dive": {
    "market_size_signal": "<1-2 sentences on whether the target market is large enough to justify the growth idea>",
    "competitive_positioning": "<1-2 sentences on how the venture differentiates or could be displaced>",
    "execution_feasibility": "<1-2 sentences on whether the team, resources, and timeline are realistic for the proposed growth>",
    "growth_summary": "<1-2 sentences on overall growth opportunity quality>"
  },
  "strengths": [
    "<Strength 1>",
    "<Strength 2>",
    "<Strength 3>",
    "<Strength 4>",
    "<Strength 5>"
  ],
  "risks": [
    "<Risk 1>",
    "<Risk 2>",
    "<Risk 3>",
    "<Risk 4>",
    "<Risk 5>"
  ],
  "interview_questions": [
    {
      "question": "<Interview question 1>",
      "intent": "<What the panel is trying to validate with this question>",
      "red_flag": "<What answer would be a warning sign>"
    },
    {
      "question": "<Interview question 2>",
      "intent": "<Intent>",
      "red_flag": "<Red flag>"
    },
    {
      "question": "<Interview question 3>",
      "intent": "<Intent>",
      "red_flag": "<Red flag>"
    },
    {
      "question": "<Interview question 4>",
      "intent": "<Intent>",
      "red_flag": "<Red flag>"
    },
    {
      "question": "<Interview question 5>",
      "intent": "<Intent>",
      "red_flag": "<Red flag>"
    }
  ]
}

Return ONLY the JSON object, no additional text.
```

---

## Output Format Guidelines

### Panel Recommendation

The panel recommendation reflects a final accept/reject decision, not a tier assignment (the tier was already decided during screening):

| Recommendation | Meaning |
|----------------|---------|
| **Accept** | Venture is ready to enter the assigned program tier. Strong fundamentals, credible growth plan, gaps are manageable. |
| **Accept with Conditions** | Venture is promising but has specific gaps or risks that must be addressed as conditions of entry (e.g., submit a detailed GTM plan within 30 days, secure co-founder for technology). |
| **Defer** | Venture has potential but is not ready now. Recommend re-application in the next cohort after addressing specific shortcomings. |
| **Reject** | Venture does not meet program standards. Fundamental issues with market opportunity, team capability, or revenue credibility that Accelerate cannot address. |

### Gap Deep Dive

**Critical Gaps (3 items):** Gaps that are severe enough to threaten the venture's success even with Accelerate's support. These might include missing core team competencies, no product-market fit evidence, or fundamental strategic misalignment.

**Addressable Gaps (3 items):** Gaps that Accelerate's mentorship, resources, and network can realistically help close. These might include go-to-market refinement, capital planning, operational scaling, or supply chain optimization.

**Gap Summary:** An overall assessment of gap severity and whether the Accelerate program can bridge them within the cohort timeline.

### Revenue Deep Dive

**Current Health:** Go beyond the top-line number. Consider revenue quality — is it recurring or project-based? Is there customer concentration risk? What are the margins?

**Projection Credibility:** Calculate the implied CAGR from current revenue to 3-year target. Flag projections that require unrealistic growth without clear drivers.

**Key Revenue Risks (3 items):** Specific threats to the revenue trajectory — customer churn, pricing pressure, regulatory impact, dependency on a single contract, etc.

**Revenue Summary:** An overall assessment of revenue outlook and whether the trajectory supports the assigned tier.

### Growth Opportunity Deep Dive

**Market Size Signal:** Is the venture targeting a large, growing market, or a niche that caps their upside?

**Competitive Positioning:** Does the venture have a defensible moat (technology, brand, distribution, regulatory), or can incumbents or new entrants easily replicate their approach?

**Execution Feasibility:** Does the team have the bandwidth, skills, and resources to execute the growth plan within the stated timeline?

**Growth Summary:** An overall assessment of the growth opportunity quality and the venture's ability to capture it.

### PROS (5 points)

Identify 5 strengths. At this stage, go deeper than surface-level observations. Focus on:

- Evidence of product-market fit (paying customers, retention, repeat purchases)
- Founder/team execution track record
- Defensible competitive advantages
- Revenue quality and growth momentum
- Strategic clarity and market timing
- Strength of the growth idea relative to current capabilities
- Alignment between what the venture needs and what Accelerate provides

### CONS (5 points)

Identify 5 risks. At the panel stage, focus on:

- Unvalidated assumptions in the growth plan
- Revenue concentration or quality concerns
- Team gaps that could bottleneck execution
- Competitive threats not addressed in the application
- Capital requirements vs. available funding
- Regulatory, compliance, or market-entry barriers
- Scaling risks (operational, supply chain, hiring)

### INTERVIEW QUESTIONS (5 questions with intent and red flags)

Each question should be structured to help the panel extract maximum signal during a time-limited interview:

- **question:** The specific question to ask the founder
- **intent:** What the panel is trying to learn or validate (helps panelists understand why this question matters)
- **red_flag:** What kind of answer would be a warning sign (helps panelists evaluate responses in real time)

Questions should cover:

- At least 1 question probing the most critical gap
- At least 1 question stress-testing the revenue projection
- At least 1 question exploring growth opportunity defensibility
- At least 1 question assessing founder/team execution readiness
- At least 1 question on resource allocation and prioritization

### General Guidelines

- Keep each point concise (1-2 sentences) unless the deep-dive sections call for more
- Be specific to the venture's data — avoid generic accelerator platitudes
- Build on the screening manager's notes and prior AI screening insights rather than repeating them
- If a corporate presentation is available, cross-reference claims in the application against the presentation
- Maintain a rigorous but fair tone — the goal is to help the panel make an evidence-based decision
- Flag any discrepancies between the application data and corporate presentation

---

## Output Schema

```typescript
interface PanelInsights {
    panel_recommendation: string;    // "Accept" | "Accept with Conditions" | "Defer" | "Reject"
    generated_at: string;            // ISO timestamp (added during parsing)
    executive_summary: string;       // 3-4 sentence summary
    market_context: string;          // 2-3 sentence sector landscape
    gap_deep_dive: {
        critical_gaps: string[];     // Exactly 3 critical gaps
        addressable_gaps: string[];  // Exactly 3 addressable gaps
        gap_summary: string;         // 1-2 sentence summary
    };
    revenue_deep_dive: {
        current_health: string;      // 1-2 sentences
        projection_credibility: string; // 1-2 sentences
        key_revenue_risks: string[]; // Exactly 3 revenue risks
        revenue_summary: string;     // 1-2 sentences
    };
    growth_opportunity_deep_dive: {
        market_size_signal: string;      // 1-2 sentences
        competitive_positioning: string; // 1-2 sentences
        execution_feasibility: string;   // 1-2 sentences
        growth_summary: string;          // 1-2 sentences
    };
    strengths: string[];             // Exactly 5 strengths
    risks: string[];                 // Exactly 5 risks
    interview_questions: {
        question: string;
        intent: string;
        red_flag: string;
    }[];                             // Exactly 5 structured questions
}
```

---

## Data Flow

```
Panel Dashboard (frontend)
    │
    ├── User clicks "Generate Panel Insights"
    │   └── Optional: enters panel notes
    │
    ▼
POST /api/ventures/:id/generate-insights?type=panel
    │
    ├── 1. Fetch venture data from `ventures` table
    ├── 2. Fetch corporate_presentation_url from `venture_applications`
    ├── 3. Extract text from document (if available)
    ├── 4. Fetch prior screening insights from `ventures.ai_analysis`
    ├── 5. Build V2 prompt with all data + VSM notes + panel notes + prior insights
    ├── 6. Call Claude API (claude-sonnet-4-5-20250929, max_tokens: 2500)
    ├── 7. Parse JSON response (with fallback)
    ├── 8. Save panel insights to `ventures.panel_ai_analysis` (JSONB)
    ├── 9. Update `ventures.panel_reviewed_at`
    │
    ▼
Return panel insights to frontend
```

---

## Fallback Behavior

If Claude's response fails to parse as valid JSON or required arrays don't have the correct number of items:

```json
{
    "panel_recommendation": "Accept with Conditions",
    "executive_summary": "Evaluated \"[venture name]\" - Deep-dive AI analysis completed but requires manual panel review for final decision.",
    "market_context": "Automated analysis. Market context requires panel discussion.",
    "gap_deep_dive": {
        "critical_gaps": [
            "Strategic gap assessment requires manual review.",
            "Team capability evaluation pending panel discussion.",
            "Execution readiness to be validated in interview."
        ],
        "addressable_gaps": [
            "Go-to-market strategy can be refined with Accelerate support.",
            "Capital planning can be strengthened through mentorship.",
            "Operational scaling playbook available through program resources."
        ],
        "gap_summary": "Automated gap analysis incomplete. Panel should assess gaps during interview."
    },
    "revenue_deep_dive": {
        "current_health": "Current revenue trajectory requires panel evaluation against industry benchmarks.",
        "projection_credibility": "3-year revenue target needs validation of underlying growth assumptions.",
        "key_revenue_risks": [
            "Revenue concentration risk to be assessed.",
            "Growth rate sustainability to be validated.",
            "Margin profile requires clarification."
        ],
        "revenue_summary": "Revenue analysis requires manual deep-dive by panel."
    },
    "growth_opportunity_deep_dive": {
        "market_size_signal": "Market opportunity size requires panel assessment.",
        "competitive_positioning": "Competitive landscape and defensibility to be discussed in interview.",
        "execution_feasibility": "Team and resource readiness for growth plan requires validation.",
        "growth_summary": "Growth opportunity evaluation pending panel discussion."
    },
    "strengths": [
        "Strong revenue base (LTM).",
        "Clear focus on [growth_focus].",
        "Experienced team structure.",
        "Proven market fit in current segment.",
        "Scalable business model with clear unit economics."
    ],
    "risks": [
        "Competitive landscape in new geography.",
        "Capital efficiency concern.",
        "Go-to-market strategy needs refinement.",
        "Limited runway for market expansion.",
        "Dependency on key personnel."
    ],
    "interview_questions": [
        {
            "question": "How do you plan to acquire the first 10 customers in the new segment?",
            "intent": "Validate go-to-market readiness.",
            "red_flag": "No specific customer acquisition plan."
        },
        {
            "question": "What is the breakdown of the 3-year revenue potential?",
            "intent": "Assess revenue projection granularity.",
            "red_flag": "Cannot articulate revenue drivers."
        },
        {
            "question": "Can you elaborate on the specific compliance hurdles?",
            "intent": "Understand regulatory awareness.",
            "red_flag": "Unaware of key regulatory requirements."
        },
        {
            "question": "What is the burn rate impact of the new hiring plan?",
            "intent": "Evaluate capital planning maturity.",
            "red_flag": "No financial model for team expansion."
        },
        {
            "question": "How does the current product adapt to the new market?",
            "intent": "Assess product-market fit for expansion.",
            "red_flag": "No adaptation plan or customer validation."
        }
    ]
}
```

---

## Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Missing API key | 500 | `ANTHROPIC_API_KEY is not configured in environment variables` |
| Invalid API key | 500 | `Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY.` |
| Rate limit exceeded | 500 | `Rate limit exceeded. Please try again later.` |
| JSON parse failure | N/A | Returns fallback insights (no error to user) |
| DB save failure | 200 | Insights still returned even if database update fails |

---

## Version History

- **v1.0** (2026-03-06): Initial panel interview prompt — deep-dive with structured gap/revenue/growth analysis, interview questions with intent and red flags, Accept/Reject recommendation framework

---

**Last Updated:** 2026-03-06
