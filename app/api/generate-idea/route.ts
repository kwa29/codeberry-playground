import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_CONTENT_LENGTH = 500000;
const MAX_SUMMARY_LENGTH = 100;

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '... (truncated)';
}

async function summarizePitchDeck(content: string): Promise<string> {
  const summarizationPrompt = `Summarize the key points of this pitch deck in ${MAX_SUMMARY_LENGTH} words or less:\n\n${truncateContent(content, 1000)}`;
  
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: summarizationPrompt }],
    model: "gpt-3.5-turbo",
  });

  return truncateContent(completion.choices[0].message.content || '', MAX_SUMMARY_LENGTH * 7);
}

function normalizeScore(score: number): number {
  return Math.min(Math.max(score, 0), 100); // Ensure score is between 0% and 100%
}

interface Weights {
  tech: number;
  gtm: number;
  investmentMemo: number;
}

function calculateWeightedScore(scores: number[], weights: number[]): number {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return scores.reduce((sum, score, index) => sum + score * weights[index], 0) / totalWeight;
}

export async function POST(req: NextRequest) {
  console.log('API route hit');
  
  try {
    const formData = await req.formData();
    const query = formData.get('query') as string;
    const pitchDeck = formData.get('pitchDeck') as File | null;
    const startupStage = formData.get('startupStage') as string || 'early';
    const customWeights = JSON.parse(formData.get('customWeights') as string || '{}') as Partial<Weights>;

    let pitchDeckContent = '';
    if (pitchDeck) {
      const arrayBuffer = await pitchDeck.arrayBuffer();
      pitchDeckContent = new TextDecoder().decode(arrayBuffer);
      pitchDeckContent = await summarizePitchDeck(pitchDeckContent);
    }

    const prompt = `
      Analyze this startup idea very briefly:
      
      Idea: ${truncateContent(query, 200)}
      ${pitchDeckContent ? `Pitch Deck: ${pitchDeckContent}` : ''}
      Startup Stage: ${startupStage}

      Provide a concise analysis with:
      1. SWOT (1 each)
      2. 2 critical questions
      3. 3-step action plan
      4. 2 target market strategies
      5. 2 main competitors
      6. 2 market demand indicators
      7. 2 relevant frameworks
      8. Investment memo (summary, market opportunity, business model, competitive advantage, financial projections, funding requirements)
      9. 3 technical due diligence points with scores (0-100%)
      10. 3 go-to-market due diligence points with scores (0-100%)
      11. 6 investment memo quality scores (0-100%) for each section of the investment memo

      Use the pitch deck information (if available) to inform your analysis, especially for the due diligence points and scores.

      JSON format:
      {
        "idea": "Summary",
        "swot": {
          "strengths": ["S1"],
          "weaknesses": ["W1"],
          "opportunities": ["O1"],
          "threats": ["T1"]
        },
        "criticalQuestions": ["Q1", "Q2"],
        "actionPlan": ["Step1", "Step2", "Step3"],
        "targetMarketStrategies": ["Strategy1", "Strategy2"],
        "competition": ["Competitor1", "Competitor2"],
        "marketDemandIndicators": ["Indicator1", "Indicator2"],
        "frameworks": ["Framework1", "Framework2"],
        "investmentMemo": {
          "summary": "Brief summary",
          "marketOpportunity": "Market opportunity",
          "businessModel": "Business model",
          "competitiveAdvantage": "Competitive advantage",
          "financialProjections": "Financial projections",
          "fundingRequirements": "Funding requirements"
        },
        "dueDiligenceTech": [
          {"point": "Tech1", "score": 0},
          {"point": "Tech2", "score": 0},
          {"point": "Tech3", "score": 0}
        ],
        "dueDiligenceGTM": [
          {"point": "GTM1", "score": 0},
          {"point": "GTM2", "score": 0},
          {"point": "GTM3", "score": 0}
        ],
        "investmentMemoScores": {
          "summary": 0,
          "marketOpportunity": 0,
          "businessModel": 0,
          "competitiveAdvantage": 0,
          "financialProjections": 0,
          "fundingRequirements": 0
        }
      }
      Keep all responses extremely brief.
    `;

    const truncatedPrompt = truncateContent(prompt, MAX_CONTENT_LENGTH);

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: truncatedPrompt }],
      model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;
    console.log('Raw OpenAI API Response:', response);

    if (!response) {
      throw new Error('No response from OpenAI API');
    }

    const parsedResponse = JSON.parse(response);
    console.log('Parsed OpenAI Response:', parsedResponse);

    parsedResponse.pitchDeckProcessed = !!pitchDeckContent;

    // Error handling for missing fields
    if (!parsedResponse.dueDiligenceTech || !parsedResponse.dueDiligenceGTM || !parsedResponse.investmentMemoScores) {
      console.error('Missing fields in OpenAI response:', parsedResponse);
      throw new Error('Incomplete response from OpenAI API');
    }

    console.log('Due Diligence Tech:', parsedResponse.dueDiligenceTech);
    console.log('Due Diligence GTM:', parsedResponse.dueDiligenceGTM);
    console.log('Investment Memo Scores:', parsedResponse.investmentMemoScores);

    // Calculate scores (already in percentage)
    parsedResponse.techScore = parsedResponse.dueDiligenceTech.reduce((sum: number, item: { score: number }) => sum + item.score, 0) / 3;
    parsedResponse.gtmScore = parsedResponse.dueDiligenceGTM.reduce((sum: number, item: { score: number }) => sum + item.score, 0) / 3;
    parsedResponse.confidenceScore = Object.values(parsedResponse.investmentMemoScores).reduce((sum: number, score: unknown) => {
      if (typeof score === 'number') {
        return sum + score;
      }
      return sum;
    }, 0) / 6;

    console.log('Calculated Scores:', {
      techScore: parsedResponse.techScore,
      gtmScore: parsedResponse.gtmScore,
      confidenceScore: parsedResponse.confidenceScore
    });

    // Define weights based on startup stage and custom weights
    let weights: Weights = {
      tech: 0.33,
      gtm: 0.33,
      investmentMemo: 0.34
    };

    if (startupStage === 'early') {
      weights = { tech: 0.4, gtm: 0.3, investmentMemo: 0.3 };
    } else if (startupStage === 'growth') {
      weights = { tech: 0.3, gtm: 0.4, investmentMemo: 0.3 };
    } else if (startupStage === 'late') {
      weights = { tech: 0.2, gtm: 0.3, investmentMemo: 0.5 };
    }

    // Apply custom weights if provided
    weights = { ...weights, ...customWeights };

    // Calculate weighted global score
    parsedResponse.globalScore = calculateWeightedScore(
      [parsedResponse.techScore, parsedResponse.gtmScore, parsedResponse.confidenceScore],
      [weights.tech, weights.gtm, weights.investmentMemo]
    );

    // Add weights to the response
    parsedResponse.weights = weights;

    console.log('Final Response:', parsedResponse);

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'An error occurred while processing your request.' }, { status: 500 });
  }
}