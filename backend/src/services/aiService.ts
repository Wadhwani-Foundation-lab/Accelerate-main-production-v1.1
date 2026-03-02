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
}

export interface RoadmapDeliverable {
    id: string;
    title: string;
    description: string;
    status: 'pending';
    priority: 'high' | 'medium' | 'low';
    timeline: string; // Q1, Q2, Q3, Q4
}

export interface RoadmapData {
    product: RoadmapDeliverable[];
    gtm: RoadmapDeliverable[];
    funding: RoadmapDeliverable[];
    supply_chain: RoadmapDeliverable[];
    operations: RoadmapDeliverable[];
    team: RoadmapDeliverable[];
}

export interface AIInsights {
    recommendation: string;
    generated_at: string;
    summary: string;
    context: string;
    strengths: string[];
    risks: string[];
    questions: string[];
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
    return `You are a Venture Screening Manager evaluating a startup application for an accelerator program. Analyze the following venture data and provide structured insights.

**Venture Information:**
- Company Name: ${ventureData.name}
- Founder: ${ventureData.founder_name || 'N/A'}
- Current Revenue (12M): ₹${ventureData.revenue_12m?.toLocaleString() || 'N/A'}
- Target Revenue (3Y): ₹${ventureData.revenue_potential_3y?.toLocaleString() || 'N/A'}
- Full-Time Employees: ${ventureData.full_time_employees || 'N/A'}
- Growth Focus: ${ventureData.growth_focus || 'N/A'}
- Current Market: ${JSON.stringify(ventureData.growth_current || {})}
- Target Market: ${JSON.stringify(ventureData.growth_target || {})}

**Screening Manager's Notes:**
${vsmNotes || 'No additional notes provided.'}

**Your Task:**
Provide a comprehensive assessment in the following JSON format:

{
  "recommendation": "<One of: Accelerate Prime, Accelerate Core, Accelerate Essential, or Not Recommended>",
  "summary": "<2-3 sentence executive summary of the venture's potential>",
  "context": "<1 sentence about the sector/market context>",
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
  "questions": [
    "<Probing question 1>",
    "<Probing question 2>",
    "<Probing question 3>",
    "<Probing question 4>",
    "<Probing question 5>"
  ]
}

**Guidelines:**
- Provide exactly 5 strengths (PROS) and 5 risks (CONS)
- Make probing questions specific and actionable
- Base recommendation on revenue trajectory, market opportunity, and team capability
- Keep each point concise (1-2 sentences max)

Return ONLY the JSON object, no additional text.`;
}

/**
 * Parse Claude's response into structured insights
 */
function parseClaudeResponse(responseText: string, ventureData: VentureData): AIInsights {
    try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and structure the response
        return {
            recommendation: parsed.recommendation || 'Accelerate Core',
            generated_at: new Date().toISOString(),
            summary: parsed.summary || `Evaluated ${ventureData.name}`,
            context: parsed.context || 'Analysis completed.',
            strengths: Array.isArray(parsed.strengths) && parsed.strengths.length === 5
                ? parsed.strengths
                : [
                    'Strong revenue base.',
                    'Clear growth focus.',
                    'Experienced team.',
                    'Proven market fit.',
                    'Scalable model.'
                ],
            risks: Array.isArray(parsed.risks) && parsed.risks.length === 5
                ? parsed.risks
                : [
                    'Competitive landscape.',
                    'Capital efficiency.',
                    'Go-to-market needs refinement.',
                    'Limited runway.',
                    'Key person dependency.'
                ],
            questions: Array.isArray(parsed.questions) && parsed.questions.length === 5
                ? parsed.questions
                : [
                    'How will you acquire the first 10 customers?',
                    'What is the revenue breakdown?',
                    'Can you elaborate on compliance hurdles?',
                    'What is the burn rate impact?',
                    'How does the product adapt to new markets?'
                ]
        };
    } catch (error) {
        console.error('Error parsing Claude response:', error);
        console.log('Raw response:', responseText);

        // Return fallback insights if parsing fails
        return {
            recommendation: 'Accelerate Core',
            generated_at: new Date().toISOString(),
            summary: `Evaluated "${ventureData.name}" - AI analysis completed but requires manual review.`,
            context: 'Automated analysis.',
            strengths: [
                'Strong revenue base (LTM).',
                `Clear focus on ${ventureData.growth_focus || 'growth'}.`,
                'Experienced team structure.',
                'Proven market fit in current segment.',
                'Scalable business model with clear unit economics.'
            ],
            risks: [
                'Competitive landscape in new geography.',
                'Capital efficiency concern.',
                'Go-to-market strategy needs refinement.',
                'Limited runway for market expansion.',
                'Dependency on key personnel.'
            ],
            questions: [
                'How do you plan to acquire the first 10 customers in the new segment?',
                'What is the breakdown of the 3-year revenue potential?',
                'Can you elaborate on the specific compliance hurdles?',
                'What is the burn rate impact of the new hiring plan?',
                'How does the current product adapt to the new market?'
            ]
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
            max_tokens: 4000,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
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

function buildRoadmapPrompt(ventureData: any, ctx: { vsmNotes?: string; aiAnalysis?: any }): string {
    const aiSummary = ctx.aiAnalysis
        ? `\n**AI Screening Analysis:**\n- Recommendation: ${ctx.aiAnalysis.recommendation || 'N/A'}\n- Summary: ${ctx.aiAnalysis.summary || 'N/A'}\n- Strengths: ${(ctx.aiAnalysis.strengths || []).join('; ')}\n- Risks: ${(ctx.aiAnalysis.risks || []).join('; ')}`
        : '';

    return `You are a startup accelerator program manager. Based on the venture data below, generate a personalized journey roadmap with actionable deliverables across six streams.

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
${aiSummary}

**Task:** Generate 4-6 deliverables for EACH of the following 6 streams. Return ONLY a JSON object:

{
  "product": [ { "id": "prod_1", "title": "...", "description": "...", "status": "pending", "priority": "high|medium|low", "timeline": "Q1|Q2|Q3|Q4" }, ... ],
  "gtm": [ ... ],
  "funding": [ ... ],
  "supply_chain": [ ... ],
  "operations": [ ... ],
  "team": [ ... ]
}

**Guidelines:**
- Each deliverable must have a unique id (e.g. prod_1, gtm_2, fund_3, sc_4, ops_5, team_6)
- Titles should be concise (3-5 words)
- Descriptions should be specific to THIS venture's business, not generic
- Assign priority based on urgency: high = critical blocker, medium = important, low = nice to have
- Spread timelines across Q1-Q4 realistically
- All statuses must be "pending"

Return ONLY the JSON object, no additional text.`;
}

function parseRoadmapResponse(responseText: string): RoadmapData {
    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const parsed = JSON.parse(jsonMatch[0]);
        const streams = ['product', 'gtm', 'funding', 'supply_chain', 'operations', 'team'] as const;

        const result: any = {};
        for (const stream of streams) {
            const items = parsed[stream];
            if (Array.isArray(items) && items.length >= 4) {
                result[stream] = items.map((item: any, i: number) => ({
                    id: item.id || `${stream}_${i + 1}`,
                    title: item.title || 'Untitled',
                    description: item.description || '',
                    status: 'pending' as const,
                    priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
                    timeline: item.timeline || 'Q1'
                }));
            } else {
                // Fallback for missing stream
                result[stream] = getFallbackDeliverables(stream);
            }
        }

        return result as RoadmapData;
    } catch (error) {
        console.error('Error parsing roadmap response:', error);
        console.log('Raw response:', responseText);

        // Return fallback roadmap
        const streams = ['product', 'gtm', 'funding', 'supply_chain', 'operations', 'team'] as const;
        const result: any = {};
        for (const stream of streams) {
            result[stream] = getFallbackDeliverables(stream);
        }
        return result as RoadmapData;
    }
}

function getFallbackDeliverables(stream: string): RoadmapDeliverable[] {
    const fallbacks: Record<string, RoadmapDeliverable[]> = {
        product: [
            { id: 'prod_1', title: 'Product Audit', description: 'Comprehensive review of current product capabilities and gaps.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'prod_2', title: 'Feature Roadmap', description: 'Prioritized feature backlog aligned with growth targets.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'prod_3', title: 'Quality Framework', description: 'Testing and QA standards for product releases.', status: 'pending', priority: 'medium', timeline: 'Q2' },
            { id: 'prod_4', title: 'Tech Infrastructure', description: 'Scalability assessment and cloud architecture plan.', status: 'pending', priority: 'medium', timeline: 'Q3' },
        ],
        gtm: [
            { id: 'gtm_1', title: 'Market Analysis', description: 'Target market sizing and competitive landscape review.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'gtm_2', title: 'Sales Playbook', description: 'Standardized sales process and objection handling.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'gtm_3', title: 'Channel Strategy', description: 'Partner and distribution channel development plan.', status: 'pending', priority: 'medium', timeline: 'Q2' },
            { id: 'gtm_4', title: 'Pricing Review', description: 'Competitive pricing analysis and optimization.', status: 'pending', priority: 'medium', timeline: 'Q2' },
        ],
        funding: [
            { id: 'fund_1', title: 'Financial Model', description: 'Detailed projections and unit economics analysis.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'fund_2', title: 'Investor Deck', description: 'Compelling pitch materials for fundraising.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'fund_3', title: 'Data Room', description: 'Organized due diligence documentation.', status: 'pending', priority: 'medium', timeline: 'Q2' },
            { id: 'fund_4', title: 'Investor Pipeline', description: 'Targeted list of potential investors and outreach plan.', status: 'pending', priority: 'medium', timeline: 'Q2' },
        ],
        supply_chain: [
            { id: 'sc_1', title: 'Vendor Assessment', description: 'Evaluation of current supplier performance and risks.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'sc_2', title: 'Cost Optimization', description: 'Identify cost reduction opportunities in procurement.', status: 'pending', priority: 'medium', timeline: 'Q2' },
            { id: 'sc_3', title: 'Logistics Review', description: 'Delivery and fulfillment process improvement plan.', status: 'pending', priority: 'medium', timeline: 'Q2' },
            { id: 'sc_4', title: 'Compliance Check', description: 'Regulatory and quality certification requirements.', status: 'pending', priority: 'low', timeline: 'Q3' },
        ],
        operations: [
            { id: 'ops_1', title: 'Process Mapping', description: 'Document and optimize core business processes.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'ops_2', title: 'Systems Audit', description: 'Review of current tools and automation opportunities.', status: 'pending', priority: 'medium', timeline: 'Q1' },
            { id: 'ops_3', title: 'KPI Dashboard', description: 'Real-time operational metrics tracking setup.', status: 'pending', priority: 'medium', timeline: 'Q2' },
            { id: 'ops_4', title: 'Scaling Plan', description: 'Operational readiness for 3x growth scenario.', status: 'pending', priority: 'low', timeline: 'Q3' },
        ],
        team: [
            { id: 'team_1', title: 'Org Structure', description: 'Define roles and reporting lines for growth phase.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'team_2', title: 'Hiring Plan', description: 'Critical hires roadmap with timelines and budgets.', status: 'pending', priority: 'high', timeline: 'Q1' },
            { id: 'team_3', title: 'Performance System', description: 'KPIs and review cadence for all team members.', status: 'pending', priority: 'medium', timeline: 'Q2' },
            { id: 'team_4', title: 'Culture Playbook', description: 'Values documentation and onboarding program.', status: 'pending', priority: 'low', timeline: 'Q3' },
        ],
    };
    return fallbacks[stream] || fallbacks.product;
}
