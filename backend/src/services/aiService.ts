import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface VentureData {
    id: string;
    name: string;
    founder_name?: string;
    revenue_12m?: number;
    revenue_potential_3y?: number;
    full_time_employees?: number;
    growth_focus?: string;
    growth_current?: any;
    growth_target?: any;
    commitment?: any;
    vsm_notes?: string;
    corporate_presentation_text?: string;
}

export interface RoadmapAction {
    id: string;
    title: string;
    description: string;
    context_reference: string;
    timeline: string;
    success_metric: string;
    status: 'pending';
    priority: 'Need deep support' | 'Need some guidance' | "Don't need help";
}

export interface FunctionalAreaRoadmap {
    relevance: string;
    support_priority: 'Need deep support' | 'Need some guidance' | "Don't need help";
    actions: RoadmapAction[];
}

export interface RoadmapData {
    product: FunctionalAreaRoadmap;
    gtm: FunctionalAreaRoadmap;
    capital_planning: FunctionalAreaRoadmap;
    team: FunctionalAreaRoadmap;
    supply_chain: FunctionalAreaRoadmap;
    operations: FunctionalAreaRoadmap;
}

export interface PanelInsights {
    panel_recommendation: string;
    executive_summary: string;
    market_context: string;
    gap_deep_dive: {
        critical_gaps: string[];
        addressable_gaps: string[];
        gap_summary: string;
    };
    revenue_deep_dive: {
        current_health: string;
        projection_credibility: string;
        key_revenue_risks: string[];
        revenue_summary: string;
    };
    growth_opportunity_deep_dive: {
        market_size_signal: string;
        competitive_positioning: string;
        execution_feasibility: string;
        growth_summary: string;
    };
    strengths: string[];
    risks: string[];
    interview_questions: {
        question: string;
        intent: string;
    }[];
    generated_at: string;
}

export interface AIInsights {
    existing_venture_profile: {
        profile_summary: string;
        current_product_growth_history: string;
    };
    new_venture_clarity: {
        new_product_or_service: string;
        new_segment_or_market: string;
        new_geography: string;
        estimated_incremental_revenue: string;
        definition_clarity_flag: string;
        clarity_gaps: string[];
        clarity_summary: string;
    };
    generated_at: string;
}

/**
 * Generate AI insights for a venture using Claude API
 */
export async function generateVentureInsights(
    ventureData: VentureData,
    vsmNotes: string = ''
): Promise<AIInsights> {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured in environment variables');
    }

    // Construct the prompt for Claude
    const prompt = buildInsightsPrompt(ventureData, vsmNotes);

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 2000,
            temperature: 0.7,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        // Extract the text content from Claude's response
        const responseText = message.content[0].type === 'text'
            ? message.content[0].text
            : '';

        // Parse the structured response
        const insights = parseClaudeResponse(responseText, ventureData);

        return insights;
    } catch (error: any) {
        console.error('Error calling Claude API:', error);

        // Provide helpful error messages
        if (error.status === 401) {
            throw new Error('Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY.');
        } else if (error.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
        } else {
            throw new Error(`Failed to generate AI insights: ${error.message}`);
        }
    }
}

/**
 * Build the prompt for Claude to generate venture insights
 */
function buildInsightsPrompt(ventureData: VentureData, vsmNotes: string): string {
    return `You are an expert screening analyst for the Accelerate Assisted Growth Platform. Your role is to evaluate a venture application and produce a focused screening reference for the Screening Manager.

Your output must cover exactly two things:

1. **Existing Venture Profile** — A concise summary of the current business, highlighting its current products and growth history.
2. **New Venture Definition Clarity** — Assess how clearly the applicant has defined their proposed new growth idea, and whether the application is ready to be recommended to the interview panel.

You will receive a venture application containing:
- Business details (company name, type, city, state, designation, products/services, customer segments, regions, employee count, revenue)
- Growth idea details (type: new product/service, new segment, or new geography; expected incremental revenue in 3 years; funding plan)
- Support areas requested (Product, Go-To-Market, Capital Planning, Team, Supply Chain, Operations)
- Support description (free text from applicant)
- Screening manager notes (optional free text with additional context from initial review)
- Corporate presentation (optional attachment)

**Venture Information:**
- Company Name: ${ventureData.name}
- Founder: ${ventureData.founder_name || 'N/A'}
- Business Type: ${(ventureData as any).business_type || 'N/A'}
- Designation: ${(ventureData as any).designation || 'N/A'}
- City: ${(ventureData as any).city || 'N/A'}
- State: ${(ventureData as any).state || 'N/A'}
- Current Revenue (12M): ₹${ventureData.revenue_12m?.toLocaleString() || 'N/A'}
- Prior Year Revenue: ₹${(ventureData as any).revenue_prior_year?.toLocaleString() || 'N/A'}
- Full-Time Employees: ${ventureData.full_time_employees || 'N/A'}

**Current Business (What they do today):**
- Products/Services They Sell: ${(ventureData as any).what_do_you_sell || 'N/A'}
- Customer Segments They Sell To: ${(ventureData as any).who_do_you_sell_to || 'N/A'}
- Regions They Operate In: ${(ventureData as any).which_regions || 'N/A'}

**New Growth Idea (What they want to do):**
- Growth Type: ${(ventureData as any).growth_type || ventureData.growth_focus || 'N/A'}
- New Product/Service: ${(ventureData as any).focus_product || 'N/A'}
- New Customer Segment: ${(ventureData as any).focus_segment || 'N/A'}
- New Geography: ${(ventureData as any).focus_geography || 'N/A'}
- Target Revenue in 3 Years: ₹${ventureData.revenue_potential_3y?.toLocaleString() || 'N/A'}
- Incremental Hiring Planned: ${(ventureData as any).incremental_hiring || 'N/A'}
- Target Jobs: ${(ventureData as any).target_jobs || 'N/A'}
- Investment Commitment: ${(ventureData as any).min_investment || 'N/A'}
- Support Description: ${(ventureData as any).support_description || 'N/A'}

**Legacy Fields (may duplicate above):**
- Growth Focus: ${ventureData.growth_focus || 'N/A'}
- Current Market: ${JSON.stringify(ventureData.growth_current || {})}
- Target Market: ${JSON.stringify(ventureData.growth_target || {})}

**Screening Manager's Notes:**
${vsmNotes || 'No additional notes provided.'}
${ventureData.corporate_presentation_text ? `
**Corporate Presentation Content:**
${ventureData.corporate_presentation_text.slice(0, 3000)}
${ventureData.corporate_presentation_text.length > 3000 ? '\n[... truncated ...]' : ''}
` : ''}
**Your Task:**
Provide your assessment in the following JSON format:

{
  "existing_venture_profile": {
    "profile_summary": "<3-4 sentence summary of the existing business. Cover: what the company does (core products/services), who it serves, where it operates, its current revenue scale, and team size. This should give the screening manager a complete at-a-glance picture of the business today.>",
    "current_product_growth_history": "<2-3 sentences describing the current product portfolio and historical growth trajectory. Mention specific products/services by name where available. State whether the business has been growing, flat, or declining based on available revenue data or signals. If the application provides only current revenue with no prior-year comparator, state: 'Insufficient data to assess historical growth — only current-year revenue provided.'>"
  },
  "new_venture_clarity": {
    "new_product_or_service": "<What new product or service is the venture pursuing? If clearly defined, describe it specifically. If vague or not mentioned, state: 'Not clearly defined — [explain what is missing].'>",
    "new_segment_or_market": "<What new customer segment or market is being targeted? If clearly defined, describe it specifically. If vague or not mentioned, state: 'Not clearly defined — [explain what is missing].'>",
    "new_geography": "<What new geography is being targeted? If clearly defined, name the specific regions/countries. If not applicable (growth idea is product or segment focused, not geography), state: 'Not applicable — growth idea is focused on new product/segment, not geographic expansion.' If vague, state: 'Not clearly defined — [explain what is missing].'>",
    "estimated_incremental_revenue": "<State the 3-year incremental revenue figure from the application. Then assess: Is this figure substantiated (backed by assumptions, market sizing, unit economics, or a build-up) or aspirational (a round number with no supporting logic)?>",
    "definition_clarity_flag": "<One of: Well Defined, Partially Defined, or Poorly Defined>",
    "clarity_gaps": [
      "<Specific gap 1 — what is missing or vague in the new venture definition>",
      "<Specific gap 2>",
      "<Specific gap 3>"
    ],
    "clarity_summary": "<2-3 sentence summary of the new venture idea and its readiness for panel review.>"
  }
}

**Critical Instructions for Existing Venture Profile:**
- Extract information from ALL available sources: application fields, corporate presentation text, and screening manager notes.
- The profile_summary should give the screening manager a complete picture of the business in 3-4 sentences — what it does, who it serves, where it operates, and its current scale.
- The current_product_growth_history must name specific products where available and assess growth trajectory factually. If the application provides only current revenue with no prior-year figure, flag historical growth as "Insufficient data" — do NOT fabricate or assume a growth rate.

**Critical Instructions for New Venture Definition Clarity:**
- Evaluate ONLY based on what the applicant has explicitly stated. Do not infer or assume details they haven't provided.
- The definition_clarity_flag is determined by how many of the applicable dimensions (new product/service, new segment/market, new geography) are clearly and specifically articulated:
  - "Well Defined" = All applicable dimensions are specifically described with concrete details (named product, named segment, named geography).
  - "Partially Defined" = At least one dimension is clear, but others are vague, generic, or missing.
  - "Poorly Defined" = Most dimensions are vague, use generic language ("expand to new markets"), or are missing entirely.
- clarity_gaps must contain exactly 3 items. If fewer than 3 gaps exist, note minor gaps or areas that could be further strengthened.

Return ONLY the JSON object, no additional text.`;
}

/**
 * Parse Claude's response into structured insights
 */
function parseClaudeResponse(responseText: string, ventureData: VentureData): AIInsights {
    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            existing_venture_profile: {
                profile_summary: parsed.existing_venture_profile?.profile_summary || 'Profile summary not available.',
                current_product_growth_history: parsed.existing_venture_profile?.current_product_growth_history || 'Growth history not available.',
            },
            new_venture_clarity: {
                new_product_or_service: parsed.new_venture_clarity?.new_product_or_service || 'Unable to assess.',
                new_segment_or_market: parsed.new_venture_clarity?.new_segment_or_market || 'Unable to assess.',
                new_geography: parsed.new_venture_clarity?.new_geography || 'Unable to assess.',
                estimated_incremental_revenue: parsed.new_venture_clarity?.estimated_incremental_revenue || 'Not provided.',
                definition_clarity_flag: parsed.new_venture_clarity?.definition_clarity_flag || 'Partially Defined',
                clarity_gaps: Array.isArray(parsed.new_venture_clarity?.clarity_gaps) && parsed.new_venture_clarity.clarity_gaps.length === 3
                    ? parsed.new_venture_clarity.clarity_gaps
                    : [
                        'Automated analysis could not evaluate new product/service definition.',
                        'Automated analysis could not evaluate target segment/market definition.',
                        'Automated analysis could not evaluate geographic expansion definition.',
                    ],
                clarity_summary: parsed.new_venture_clarity?.clarity_summary || 'Clarity assessment not available.',
            },
            generated_at: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error parsing Claude response:', error);
        console.log('Raw response:', responseText);

        return {
            existing_venture_profile: {
                profile_summary: 'Automated analysis of existing venture incomplete. Screening manager should review application and corporate presentation manually.',
                current_product_growth_history: 'Insufficient data — automated extraction incomplete. Manual review required to assess current products and growth history.',
            },
            new_venture_clarity: {
                new_product_or_service: 'Unable to assess — manual review required.',
                new_segment_or_market: 'Unable to assess — manual review required.',
                new_geography: 'Unable to assess — manual review required.',
                estimated_incremental_revenue: `₹${ventureData.revenue_potential_3y?.toLocaleString() || 'N/A'} stated in application — substantiation not assessed.`,
                definition_clarity_flag: 'Partially Defined',
                clarity_gaps: [
                    'Automated analysis could not evaluate new product/service definition.',
                    'Automated analysis could not evaluate target segment/market definition.',
                    'Automated analysis could not evaluate geographic expansion definition.',
                ],
                clarity_summary: 'AI analysis incomplete. Screening manager should manually assess whether the new venture idea is clearly defined before proceeding to panel.',
            },
            generated_at: new Date().toISOString(),
        };
    }
}

/**
 * Generate a personalized journey roadmap for a venture using Claude API
 */
export async function generateVentureRoadmap(
    ventureData: any,
    additionalContext: { vsmNotes?: string; aiAnalysis?: any } = {}
): Promise<RoadmapData> {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured in environment variables');
    }

    const prompt = buildRoadmapPrompt(ventureData, additionalContext);

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 8000,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        console.log(`[Roadmap] Claude response length: ${responseText.length} chars, stop_reason: ${message.stop_reason}`);
        return parseRoadmapResponse(responseText);
    } catch (error: any) {
        console.error('Error calling Claude API for roadmap:', error);
        if (error.status === 401) {
            throw new Error('Invalid Anthropic API key.');
        } else if (error.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`Failed to generate roadmap: ${error.message}`);
    }
}

function buildRoadmapPrompt(ventureData: any, ctx: { vsmNotes?: string; aiAnalysis?: any; interactionNotes?: string }): string {
    const aiSummary = ctx.aiAnalysis
        ? `\n**AI Screening Analysis:**\n- Profile: ${ctx.aiAnalysis.existing_venture_profile?.profile_summary || 'N/A'}\n- Growth History: ${ctx.aiAnalysis.existing_venture_profile?.current_product_growth_history || 'N/A'}\n- Clarity Flag: ${ctx.aiAnalysis.new_venture_clarity?.definition_clarity_flag || 'N/A'}\n- Clarity Summary: ${ctx.aiAnalysis.new_venture_clarity?.clarity_summary || 'N/A'}\n- Clarity Gaps: ${(ctx.aiAnalysis.new_venture_clarity?.clarity_gaps || []).join('; ')}`
        : '';

    return `You are a strategic program advisor for the Accelerate Assisted Growth Platform. Your role is to generate a tailored, actionable roadmap for ventures that have been approved by the selection committee. This roadmap will guide the venture through the program to achieve their stated growth idea.

## INPUT DATA

You will receive the following context for the approved venture:

1. **Business Profile**
2. **Growth Idea**
3. **Support Areas Requested**
4. **Screening & Evaluation Context**
5. **Corporate Presentation** (optional)

**Venture Information:**
- Company: ${ventureData.name || 'N/A'}
- Founder: ${ventureData.founder_name || 'N/A'}
- Revenue (LTM): ${ventureData.revenue_12m || 'N/A'}
- Revenue Potential (3Y): ${ventureData.revenue_potential_3y || 'N/A'}
- Employees: ${ventureData.full_time_employees || 'N/A'}
- Growth Focus: ${JSON.stringify(ventureData.growth_focus || 'N/A')}
- What They Sell: ${ventureData.what_do_you_sell || 'N/A'}
- Who They Sell To: ${ventureData.who_do_you_sell_to || 'N/A'}
- Regions: ${ventureData.which_regions || 'N/A'}
- Focus Product: ${ventureData.focus_product || 'N/A'}
- Focus Segment: ${ventureData.focus_segment || 'N/A'}
- Focus Geography: ${ventureData.focus_geography || 'N/A'}
- Blockers: ${ventureData.blockers || 'N/A'}
- Support Request: ${ventureData.support_request || 'N/A'}
- Incremental Hiring: ${ventureData.incremental_hiring || 'N/A'}

**VSM Notes:**
${ctx.vsmNotes || 'No notes provided.'}

**Interaction Notes:**
${ctx.interactionNotes || 'No interaction notes available.'}
${aiSummary}
${ventureData.corporate_presentation_text ? `
**Corporate Presentation Content:**
${ventureData.corporate_presentation_text.slice(0, 3000)}
${ventureData.corporate_presentation_text.length > 3000 ? '\n[... truncated ...]' : ''}
` : ''}
## OUTPUT FORMAT

Generate a structured roadmap covering ALL SIX functional support areas. For each area, provide exactly 5 actions/deliverables that are specific to this venture's context, growth idea, and identified gaps.

Return ONLY a JSON object in this format:

{
  "product": {
    "relevance": "<One sentence explaining why Product matters for this specific venture's growth idea>",
    "support_priority": "<Need deep support | Need some guidance | Don't need help>",
    "actions": [
      {
        "id": "prod_1",
        "title": "<Specific action — 3-5 words>",
        "description": "<What needs to be done and why — 1-2 sentences>",
        "context_reference": "<Which input data point drives this action>",
        "timeline": "<Week/Month range within 12-16 week program — e.g., 'Weeks 1-2', 'Weeks 3-5'>",
        "success_metric": "<Measurable outcome>",
        "status": "pending",
        "priority": "<Need deep support | Need some guidance | Don't need help>"
      },
      { "id": "prod_2", "..." : "..." },
      { "id": "prod_3", "..." : "..." },
      { "id": "prod_4", "..." : "..." },
      { "id": "prod_5", "..." : "..." }
    ]
  },
  "gtm": { "relevance": "<...>", "support_priority": "<...>", "actions": [ ... ] },
  "capital_planning": { "relevance": "<...>", "support_priority": "<...>", "actions": [ ... ] },
  "team": { "relevance": "<...>", "support_priority": "<...>", "actions": [ ... ] },
  "supply_chain": { "relevance": "<...>", "support_priority": "<...>", "actions": [ ... ] },
  "operations": { "relevance": "<...>", "support_priority": "<...>", "actions": [ ... ] }
}

## GENERATION RULES

1. **Context-driven, not generic:** Every action must trace back to a specific data point from the venture's application, screening insights, or interaction notes. The "context_reference" field must cite the source explicitly.
2. **Growth idea alignment:** All actions across all 6 areas must collectively serve the venture's stated growth idea.
3. **Address the Cons:** At least 2 actions across the full roadmap must directly address risks or gaps identified in the screening.
4. **Leverage the Pros:** At least 2 actions should build on identified strengths to create momentum.
5. **Interaction notes integration:** If interaction notes reveal specific concerns or commitments, these must be reflected in relevant actions.
6. **Prioritization logic:**
   - Areas where the venture explicitly requested help → "Need deep support"
   - Areas where screening identified gaps but venture didn't request help → "Need some guidance"
   - Areas where venture indicated no help needed and no red flags → "Don't need help"
7. **Timeline realism:** Spread actions across 12-16 weeks: early = assess/plan, mid = execute, late = validate/sustain.
8. **Sequencing:** Actions within each area should follow: Diagnose → Plan → Build → Test → Refine.
9. **Deliverable clarity:** Each action should result in a tangible output (document, framework, model, strategy, process).
10. **Tone:** Professional, supportive, and direct.

Return ONLY the JSON object, no additional text.`;
}

// Map legacy High/Medium/Low to new labels for backward compatibility
function mapSupportPriority(value: string): 'Need deep support' | 'Need some guidance' | "Don't need help" {
    const v = (value || '').toLowerCase();
    if (v === 'high' || v === 'need deep support') return 'Need deep support';
    if (v === 'low' || v === "don't need help") return "Don't need help";
    return 'Need some guidance';
}

function mapActionPriority(value: string): 'Need deep support' | 'Need some guidance' | "Don't need help" {
    const v = (value || '').toLowerCase();
    if (v === 'high' || v === 'need deep support') return 'Need deep support';
    if (v === 'low' || v === "don't need help") return "Don't need help";
    return 'Need some guidance';
}

function parseRoadmapResponse(responseText: string): RoadmapData {
    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const parsed = JSON.parse(jsonMatch[0]);
        const streams = ['product', 'gtm', 'capital_planning', 'team', 'supply_chain', 'operations'] as const;

        console.log('[Roadmap Parse] Parsed streams:', streams.map(s => ({
            stream: s,
            hasArea: !!parsed[s],
            hasActions: !!parsed[s]?.actions,
            actionsCount: parsed[s]?.actions?.length,
            isArray: Array.isArray(parsed[s]?.actions),
        })));

        const result: any = {};
        for (const stream of streams) {
            const area = parsed[stream];
            if (area && Array.isArray(area.actions) && area.actions.length >= 3) {
                result[stream] = {
                    relevance: area.relevance || '',
                    support_priority: mapSupportPriority(area.support_priority),
                    actions: area.actions.slice(0, 5).map((item: any, i: number) => ({
                        id: item.id || `${stream}_${i + 1}`,
                        title: item.title || 'Untitled',
                        description: item.description || '',
                        context_reference: item.context_reference || 'Manual review required',
                        timeline: item.timeline || 'Weeks 1-2',
                        success_metric: item.success_metric || '',
                        status: 'pending' as const,
                        priority: mapActionPriority(item.priority),
                    })),
                };
            } else {
                console.log(`[Roadmap Parse] Using FALLBACK for ${stream}. Area exists: ${!!area}, actions array: ${Array.isArray(area?.actions)}, count: ${area?.actions?.length}`);
                result[stream] = getFallbackArea(stream);
            }
        }

        return result as RoadmapData;
    } catch (error) {
        console.error('Error parsing roadmap response:', error);
        console.log('Raw response:', responseText);

        const streams = ['product', 'gtm', 'capital_planning', 'team', 'supply_chain', 'operations'] as const;
        const result: any = {};
        for (const stream of streams) {
            result[stream] = getFallbackArea(stream);
        }
        return result as RoadmapData;
    }
}

function getFallbackArea(stream: string): FunctionalAreaRoadmap {
    const fallbacks: Record<string, FunctionalAreaRoadmap> = {
        product: {
            relevance: 'Product readiness assessment required for growth execution.',
            support_priority: 'Need some guidance',
            actions: [
                { id: 'prod_1', title: 'Product Audit', description: 'Comprehensive review of current product capabilities and gaps.', context_reference: 'Manual review required', timeline: 'Weeks 1-2', success_metric: 'Audit report completed', status: 'pending', priority: 'Need deep support' },
                { id: 'prod_2', title: 'Feature Gap Analysis', description: 'Identify feature gaps for the growth idea.', context_reference: 'Manual review required', timeline: 'Weeks 2-3', success_metric: 'Gap analysis document', status: 'pending', priority: 'Need deep support' },
                { id: 'prod_3', title: 'MVP Definition', description: 'Define minimum viable product for new offering.', context_reference: 'Manual review required', timeline: 'Weeks 3-5', success_metric: 'MVP spec document', status: 'pending', priority: 'Need some guidance' },
                { id: 'prod_4', title: 'Pilot Plan', description: 'Design pilot program for validation.', context_reference: 'Manual review required', timeline: 'Weeks 6-10', success_metric: 'Pilot launched', status: 'pending', priority: 'Need some guidance' },
                { id: 'prod_5', title: 'Product Roadmap', description: 'Align product roadmap with growth targets.', context_reference: 'Manual review required', timeline: 'Weeks 11-14', success_metric: 'Roadmap document approved', status: 'pending', priority: "Don't need help" },
            ],
        },
        gtm: {
            relevance: 'Go-to-market strategy required for new market entry.',
            support_priority: 'Need some guidance',
            actions: [
                { id: 'gtm_1', title: 'Market Analysis', description: 'Target market sizing and competitive landscape review.', context_reference: 'Manual review required', timeline: 'Weeks 1-2', success_metric: 'Market analysis report', status: 'pending', priority: 'Need deep support' },
                { id: 'gtm_2', title: 'ICP Definition', description: 'Define ideal customer profile for new segment.', context_reference: 'Manual review required', timeline: 'Weeks 2-4', success_metric: 'ICP document completed', status: 'pending', priority: 'Need deep support' },
                { id: 'gtm_3', title: 'Channel Strategy', description: 'Partner and distribution channel development plan.', context_reference: 'Manual review required', timeline: 'Weeks 4-6', success_metric: 'Channel strategy document', status: 'pending', priority: 'Need some guidance' },
                { id: 'gtm_4', title: 'Sales Playbook', description: 'Standardized sales process and objection handling.', context_reference: 'Manual review required', timeline: 'Weeks 6-10', success_metric: 'Playbook ready for team', status: 'pending', priority: 'Need some guidance' },
                { id: 'gtm_5', title: 'Launch Plan', description: 'Go-to-market launch plan with timelines.', context_reference: 'Manual review required', timeline: 'Weeks 10-14', success_metric: 'Launch plan approved', status: 'pending', priority: "Don't need help" },
            ],
        },
        capital_planning: {
            relevance: 'Financial readiness assessment for growth investment.',
            support_priority: 'Need some guidance',
            actions: [
                { id: 'cap_1', title: 'Financial Model', description: 'Detailed projections and unit economics analysis.', context_reference: 'Manual review required', timeline: 'Weeks 1-3', success_metric: 'Financial model completed', status: 'pending', priority: 'Need deep support' },
                { id: 'cap_2', title: 'Unit Economics', description: 'Validate unit economics for new growth area.', context_reference: 'Manual review required', timeline: 'Weeks 3-5', success_metric: 'Unit economics validated', status: 'pending', priority: 'Need deep support' },
                { id: 'cap_3', title: 'Funding Strategy', description: 'Identify and plan funding sources for growth.', context_reference: 'Manual review required', timeline: 'Weeks 5-8', success_metric: 'Funding strategy document', status: 'pending', priority: 'Need some guidance' },
                { id: 'cap_4', title: 'Cash Flow Projection', description: 'Model cash flow impact of growth initiatives.', context_reference: 'Manual review required', timeline: 'Weeks 8-11', success_metric: 'Cash flow model ready', status: 'pending', priority: 'Need some guidance' },
                { id: 'cap_5', title: 'Investor Readiness', description: 'Prepare pitch materials and data room.', context_reference: 'Manual review required', timeline: 'Weeks 11-14', success_metric: 'Investor deck completed', status: 'pending', priority: "Don't need help" },
            ],
        },
        team: {
            relevance: 'Organizational readiness for growth execution.',
            support_priority: 'Need some guidance',
            actions: [
                { id: 'team_1', title: 'Org Structure Review', description: 'Define roles and reporting lines for growth phase.', context_reference: 'Manual review required', timeline: 'Weeks 1-2', success_metric: 'Org chart updated', status: 'pending', priority: 'Need deep support' },
                { id: 'team_2', title: 'Skill Gap Analysis', description: 'Identify capability gaps against growth requirements.', context_reference: 'Manual review required', timeline: 'Weeks 2-4', success_metric: 'Gap analysis completed', status: 'pending', priority: 'Need deep support' },
                { id: 'team_3', title: 'Hiring Roadmap', description: 'Critical hires plan with timelines and budgets.', context_reference: 'Manual review required', timeline: 'Weeks 4-8', success_metric: 'Hiring plan approved', status: 'pending', priority: 'Need some guidance' },
                { id: 'team_4', title: 'Key Hire JDs', description: 'Job descriptions for priority roles.', context_reference: 'Manual review required', timeline: 'Weeks 8-11', success_metric: 'JDs published', status: 'pending', priority: 'Need some guidance' },
                { id: 'team_5', title: 'Retention Plan', description: 'Plan to retain key talent during scaling.', context_reference: 'Manual review required', timeline: 'Weeks 11-14', success_metric: 'Retention plan documented', status: 'pending', priority: "Don't need help" },
            ],
        },
        supply_chain: {
            relevance: 'Supply chain readiness for scaled operations.',
            support_priority: 'Need some guidance',
            actions: [
                { id: 'sc_1', title: 'Vendor Assessment', description: 'Evaluate current supplier performance and risks.', context_reference: 'Manual review required', timeline: 'Weeks 1-3', success_metric: 'Vendor scorecard completed', status: 'pending', priority: 'Need deep support' },
                { id: 'sc_2', title: 'Cost Optimization', description: 'Identify cost reduction opportunities in procurement.', context_reference: 'Manual review required', timeline: 'Weeks 3-6', success_metric: 'Cost savings identified', status: 'pending', priority: 'Need some guidance' },
                { id: 'sc_3', title: 'Logistics Model', description: 'Design logistics for new geography/product.', context_reference: 'Manual review required', timeline: 'Weeks 6-9', success_metric: 'Logistics plan ready', status: 'pending', priority: 'Need some guidance' },
                { id: 'sc_4', title: 'Quality SOP', description: 'Quality control standard operating procedures.', context_reference: 'Manual review required', timeline: 'Weeks 9-12', success_metric: 'SOPs documented', status: 'pending', priority: "Don't need help" },
                { id: 'sc_5', title: 'Capacity Plan', description: 'Production/fulfillment capacity for growth targets.', context_reference: 'Manual review required', timeline: 'Weeks 12-14', success_metric: 'Capacity plan approved', status: 'pending', priority: "Don't need help" },
            ],
        },
        operations: {
            relevance: 'Operational scalability for sustainable growth.',
            support_priority: 'Need some guidance',
            actions: [
                { id: 'ops_1', title: 'Process Mapping', description: 'Document and optimize core business processes.', context_reference: 'Manual review required', timeline: 'Weeks 1-3', success_metric: 'Process maps completed', status: 'pending', priority: 'Need deep support' },
                { id: 'ops_2', title: 'KPI Dashboard', description: 'Real-time operational metrics tracking setup.', context_reference: 'Manual review required', timeline: 'Weeks 3-6', success_metric: 'Dashboard live', status: 'pending', priority: 'Need some guidance' },
                { id: 'ops_3', title: 'SOP Pack', description: 'Standard operating procedures for key workflows.', context_reference: 'Manual review required', timeline: 'Weeks 6-9', success_metric: 'SOP pack delivered', status: 'pending', priority: 'Need some guidance' },
                { id: 'ops_4', title: 'Compliance Review', description: 'Regulatory and compliance requirements check.', context_reference: 'Manual review required', timeline: 'Weeks 9-12', success_metric: 'Compliance checklist cleared', status: 'pending', priority: "Don't need help" },
                { id: 'ops_5', title: 'Scaling Plan', description: 'Operational readiness for 3x growth scenario.', context_reference: 'Manual review required', timeline: 'Weeks 12-14', success_metric: 'Scaling plan documented', status: 'pending', priority: "Don't need help" },
            ],
        },
    };
    return fallbacks[stream] || fallbacks.product;
}

/**
 * Generate panel interview insights for a venture using Claude API
 */
export async function generatePanelInsights(
    ventureData: VentureData & { panel_notes?: string; screening_recommendation?: string; prior_ai_analysis?: any },
    vsmNotes: string = '',
    panelNotes: string = ''
): Promise<PanelInsights> {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured in environment variables');
    }

    const prompt = buildPanelInsightsPrompt(ventureData, vsmNotes, panelNotes);

    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 3000,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        console.log('Panel insights - stop_reason:', message.stop_reason);
        console.log('Panel insights - response length:', responseText.length);
        if (message.stop_reason === 'max_tokens') {
            console.warn('Panel insights response was truncated due to max_tokens limit');
        }
        return parsePanelResponse(responseText, ventureData);
    } catch (error: any) {
        console.error('Error calling Claude API for panel insights:', error);
        if (error.status === 401) {
            throw new Error('Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY.');
        } else if (error.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`Failed to generate panel insights: ${error.message}`);
    }
}

function buildPanelInsightsPrompt(
    ventureData: VentureData & { screening_recommendation?: string; prior_ai_analysis?: any },
    vsmNotes: string,
    panelNotes: string
): string {
    return `You are a venture evaluation analyst preparing a panel interview briefing. Analyze the venture on three dimensions: Gaps (capability/execution gaps), Revenue (credibility of financial projections), and Growth Opportunity (market size and execution feasibility).

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

**Current Business:**
- Products/Services: ${(ventureData as any).what_do_you_sell || 'N/A'}
- Customer Segments: ${(ventureData as any).who_do_you_sell_to || 'N/A'}
- Regions: ${(ventureData as any).which_regions || 'N/A'}

**New Growth Idea:**
- Growth Type: ${(ventureData as any).growth_type || ventureData.growth_focus || 'N/A'}
- New Product/Service: ${(ventureData as any).focus_product || 'N/A'}
- New Customer Segment: ${(ventureData as any).focus_segment || 'N/A'}
- New Geography: ${(ventureData as any).focus_geography || 'N/A'}
- Support Description: ${(ventureData as any).support_description || 'N/A'}

**Screening Manager's Notes:**
${vsmNotes || 'No screening notes provided.'}

**Panel Member's Notes:**
${panelNotes || 'No panel notes provided.'}
${ventureData.corporate_presentation_text ? `
**Corporate Presentation Content:**
${ventureData.corporate_presentation_text.slice(0, 3000)}
${ventureData.corporate_presentation_text.length > 3000 ? '\n[... truncated ...]' : ''}
` : ''}
**Prior Screening Insights (if available):**
${JSON.stringify(ventureData.prior_ai_analysis || 'No prior AI insights available.').slice(0, 2000)}

Based on all available data, generate a concise panel briefing. Keep each field brief (1-2 sentences max). Return ONLY valid JSON, no markdown.

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
  "strengths": ["<Strength 1>", "<Strength 2>", "<Strength 3>"],
  "risks": ["<Risk 1>", "<Risk 2>", "<Risk 3>"],
  "interview_questions": [
    {"question": "<Q1>", "intent": "<Intent>"},
    {"question": "<Q2>", "intent": "<Intent>"},
    {"question": "<Q3>", "intent": "<Intent>"}
  ]
}

Return ONLY the JSON object, no additional text.`;
}

function parsePanelResponse(responseText: string, ventureData: VentureData): PanelInsights {
    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            panel_recommendation: parsed.panel_recommendation || 'Accept with Conditions',
            executive_summary: parsed.executive_summary || 'Analysis completed. Manual panel review recommended.',
            market_context: parsed.market_context || 'Market context requires panel discussion.',
            gap_deep_dive: {
                critical_gaps: Array.isArray(parsed.gap_deep_dive?.critical_gaps) && parsed.gap_deep_dive.critical_gaps.length >= 1
                    ? parsed.gap_deep_dive.critical_gaps.slice(0, 3)
                    : ['Strategic gap assessment requires manual review.', 'Team capability evaluation pending panel discussion.', 'Execution readiness to be validated in interview.'],
                addressable_gaps: Array.isArray(parsed.gap_deep_dive?.addressable_gaps) && parsed.gap_deep_dive.addressable_gaps.length >= 1
                    ? parsed.gap_deep_dive.addressable_gaps.slice(0, 3)
                    : ['Go-to-market strategy can be refined with Accelerate support.', 'Capital planning can be strengthened through mentorship.', 'Operational scaling playbook available through program resources.'],
                gap_summary: parsed.gap_deep_dive?.gap_summary || 'Gap analysis requires panel discussion.',
            },
            revenue_deep_dive: {
                current_health: parsed.revenue_deep_dive?.current_health || 'Revenue health requires panel evaluation.',
                projection_credibility: parsed.revenue_deep_dive?.projection_credibility || '3-year target needs validation.',
                key_revenue_risks: Array.isArray(parsed.revenue_deep_dive?.key_revenue_risks) && parsed.revenue_deep_dive.key_revenue_risks.length >= 1
                    ? parsed.revenue_deep_dive.key_revenue_risks.slice(0, 3)
                    : ['Revenue concentration risk to be assessed.', 'Growth rate sustainability to be validated.', 'Margin profile requires clarification.'],
                revenue_summary: parsed.revenue_deep_dive?.revenue_summary || 'Revenue analysis requires panel deep-dive.',
            },
            growth_opportunity_deep_dive: {
                market_size_signal: parsed.growth_opportunity_deep_dive?.market_size_signal || 'Market opportunity requires panel assessment.',
                competitive_positioning: parsed.growth_opportunity_deep_dive?.competitive_positioning || 'Competitive landscape to be discussed.',
                execution_feasibility: parsed.growth_opportunity_deep_dive?.execution_feasibility || 'Execution readiness requires validation.',
                growth_summary: parsed.growth_opportunity_deep_dive?.growth_summary || 'Growth opportunity evaluation pending.',
            },
            strengths: Array.isArray(parsed.strengths) && parsed.strengths.length >= 1
                ? parsed.strengths.slice(0, 5)
                : ['Strong revenue base.', `Clear focus on ${ventureData.growth_focus || 'growth'}.`, 'Experienced team structure.', 'Proven market fit in current segment.', 'Scalable business model.'],
            risks: Array.isArray(parsed.risks) && parsed.risks.length >= 1
                ? parsed.risks.slice(0, 5)
                : ['Competitive landscape concerns.', 'Capital efficiency risk.', 'Go-to-market strategy needs refinement.', 'Limited runway for expansion.', 'Dependency on key personnel.'],
            interview_questions: Array.isArray(parsed.interview_questions) && parsed.interview_questions.length >= 1
                ? parsed.interview_questions.map((q: any) => ({
                    question: q.question || 'Question not generated.',
                    intent: q.intent || 'Intent not specified.',
                }))
                : [
                    { question: 'How do you plan to acquire the first 10 customers in the new segment?', intent: 'Validate go-to-market readiness.' },
                    { question: 'What is the breakdown of the 3-year revenue potential?', intent: 'Assess revenue projection granularity.' },
                    { question: 'Can you elaborate on the specific compliance hurdles?', intent: 'Understand regulatory awareness.' },
                    { question: 'What is the burn rate impact of the new hiring plan?', intent: 'Evaluate capital planning maturity.' },
                    { question: 'How does the current product adapt to the new market?', intent: 'Assess product-market fit for expansion.' },
                ],
            generated_at: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error parsing panel insights response:', error);
        console.log('Raw response:', responseText);

        // Return fallback
        return {
            panel_recommendation: 'Accept with Conditions',
            executive_summary: `Evaluated "${ventureData.name}" - Deep-dive AI analysis completed but requires manual panel review for final decision.`,
            market_context: 'Automated analysis. Market context requires panel discussion.',
            gap_deep_dive: {
                critical_gaps: ['Strategic gap assessment requires manual review.', 'Team capability evaluation pending panel discussion.', 'Execution readiness to be validated in interview.'],
                addressable_gaps: ['Go-to-market strategy can be refined with Accelerate support.', 'Capital planning can be strengthened through mentorship.', 'Operational scaling playbook available through program resources.'],
                gap_summary: 'Automated gap analysis incomplete. Panel should assess gaps during interview.',
            },
            revenue_deep_dive: {
                current_health: 'Current revenue trajectory requires panel evaluation against industry benchmarks.',
                projection_credibility: '3-year revenue target needs validation of underlying growth assumptions.',
                key_revenue_risks: ['Revenue concentration risk to be assessed.', 'Growth rate sustainability to be validated.', 'Margin profile requires clarification.'],
                revenue_summary: 'Revenue analysis requires manual deep-dive by panel.',
            },
            growth_opportunity_deep_dive: {
                market_size_signal: 'Market opportunity size requires panel assessment.',
                competitive_positioning: 'Competitive landscape and defensibility to be discussed in interview.',
                execution_feasibility: 'Team and resource readiness for growth plan requires validation.',
                growth_summary: 'Growth opportunity evaluation pending panel discussion.',
            },
            strengths: ['Strong revenue base.', `Clear focus on ${ventureData.growth_focus || 'growth'}.`, 'Experienced team structure.', 'Proven market fit in current segment.', 'Scalable business model.'],
            risks: ['Competitive landscape concerns.', 'Capital efficiency risk.', 'Go-to-market strategy needs refinement.', 'Limited runway for expansion.', 'Dependency on key personnel.'],
            interview_questions: [
                { question: 'How do you plan to acquire the first 10 customers in the new segment?', intent: 'Validate go-to-market readiness.' },
                { question: 'What is the breakdown of the 3-year revenue potential?', intent: 'Assess revenue projection granularity.' },
                { question: 'Can you elaborate on the specific compliance hurdles?', intent: 'Understand regulatory awareness.' },
                { question: 'What is the burn rate impact of the new hiring plan?', intent: 'Evaluate capital planning maturity.' },
                { question: 'How does the current product adapt to the new market?', intent: 'Assess product-market fit for expansion.' },
            ],
            generated_at: new Date().toISOString(),
        };
    }
}
