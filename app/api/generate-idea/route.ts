import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  console.log('API route hit');

  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key not configured');
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const { query, targetMarket } = await req.json();
    console.log('Received query:', query);
    console.log('Received target market:', targetMarket);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates and validates startup ideas." },
        { role: "user", content: `Generate a startup idea based on the following concept: ${query}, targeting the following market: ${targetMarket}. Then, provide a comprehensive assessment including:
        1. A brief description of the idea
        2. SWOT analysis (Strengths, Weaknesses, Opportunities, Threats)
        3. 3-5 critical questions to consider
        4. A 5-step action plan
        5. 5 ways to reach the target market
        6. 3-5 competitors or similar players to keep in mind
        7. 3-5 market demand indicators
        8. 3-5 strategic frameworks to evaluate the idea
        Format the response as JSON with keys: idea, swot (containing strengths, weaknesses, opportunities, threats as arrays), criticalQuestions (array), actionPlan (array), targetMarketStrategies (array), competition (array), marketDemandIndicators (array), frameworks (array)` }
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    console.log('Generated result:', result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ error: "Failed to generate or validate idea" }, { status: 500 });
  }
}