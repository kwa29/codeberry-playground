import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export export interface AnalysisResult {
  idea: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  criticalQuestions: string[];
  actionPlan: string[];
  targetMarketStrategies: string[];
  competition: string[];
  marketDemandIndicators: string[];
  frameworks: string[];
  globalScore: number;
  confidenceScore: number;
  techScore: number;
  gtmScore: number;
  investmentMemo: {
    summary: string;
    marketOpportunity: string;
    businessModel: string;
    competitiveAdvantage: string;
    financialProjections: string;
    fundingRequirements: string;
  };
  dueDiligenceTech: string[];
  dueDiligenceGTM: string[];
  pitchDeckProcessed?: boolean; // Add this line
}

export async function analyzeText(query: string, targetMarket: string, pitchDeckText: string): Promise<AnalysisResult> {
  const prompt = `
    Analyze the following startup idea and provide a detailed evaluation in JSON format:

    Idea: ${query}
    Target Market: ${targetMarket}
    Additional Information: ${pitchDeckText}

    Please provide your analysis in the following JSON structure:
    {
      "idea": "Brief summary of the idea",
      "swot": {
        "strengths": ["Strength 1", "Strength 2", ...],
        "weaknesses": ["Weakness 1", "Weakness 2", ...],
        "opportunities": ["Opportunity 1", "Opportunity 2", ...],
        "threats": ["Threat 1", "Threat 2", ...]
      },
      "criticalQuestions": ["Question 1", "Question 2", ...],
      "actionPlan": ["Step 1", "Step 2", ...],
      "targetMarketStrategies": ["Strategy 1", "Strategy 2", ...],
      "competition": ["Competitor 1", "Competitor 2", ...],
      "marketDemandIndicators": ["Indicator 1", "Indicator 2", ...],
      "frameworks": ["Framework 1", "Framework 2", ...],
      "globalScore": 0.0,
      "confidenceScore": 0.0,
      "techScore": 0.0,
      "gtmScore": 0.0,
      "investmentMemo": {
        "summary": "Executive summary",
        "marketOpportunity": "Market opportunity analysis",
        "businessModel": "Business model description",
        "competitiveAdvantage": "Competitive advantage analysis",
        "financialProjections": "Financial projections summary",
        "fundingRequirements": "Funding requirements"
      },
      "dueDiligenceTech": ["Tech point 1", "Tech point 2", ...],
      "dueDiligenceGTM": ["GTM point 1", "GTM point 2", ...]
    }

    Ensure that your response is a valid JSON object matching this structure.
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  const responseContent = completion.choices[0].message.content;

  if (typeof responseContent === 'string') {
    return JSON.parse(responseContent) as AnalysisResult;
  } else {
    throw new Error('Invalid response from OpenAI');
  }
}