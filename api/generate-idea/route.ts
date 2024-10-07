import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_CONTENT_LENGTH = 500000; // Further reduced
const MAX_SUMMARY_LENGTH = 100; // Drastically reduced summary length

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

export async function POST(req: NextRequest) {
  console.log('API route hit');
  
  try {
    const formData = await req.formData();
    const query = formData.get('query') as string;
    const targetMarket = formData.get('targetMarket') as string;
    const pitchDeck = formData.get('pitchDeck') as File | null;

    let pitchDeckContent = '';
    if (pitchDeck) {
      const arrayBuffer = await pitchDeck.arrayBuffer();
      pitchDeckContent = new TextDecoder().decode(arrayBuffer);
      pitchDeckContent = await summarizePitchDeck(pitchDeckContent);
    }

    const prompt = `
      Analyze this startup idea very briefly:
      
      Idea: ${truncateContent(query, 200)}
      Target Market: ${truncateContent(targetMarket, 50)}
      ${pitchDeckContent ? `Pitch Deck: ${pitchDeckContent}` : ''}

      Provide a concise analysis with:
      1. SWOT (1 each)
      2. 2 critical questions
      3. 3-step action plan
      4. 2 target market strategies
      5. 2 main competitors
      6. 2 market demand indicators
      7. 2 relevant frameworks

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
        "frameworks": ["Framework1", "Framework2"]
      }
      Keep all responses extremely brief.
    `;

    const truncatedPrompt = truncateContent(prompt, MAX_CONTENT_LENGTH);

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: truncatedPrompt }],
      model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;
    console.log('OpenAI API Response:', response);

    if (!response) {
      throw new Error('No response from OpenAI API');
    }

    const parsedResponse = JSON.parse(response);
    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ error: 'An error occurred while processing your request.' }, { status: 500 });
  }
}