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
