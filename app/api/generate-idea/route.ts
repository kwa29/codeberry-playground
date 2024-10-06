import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const { query } = await req.json();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates startup ideas." },
        { role: "user", content: `Generate a startup idea based on the following keywords: ${query}` }
      ],
      temperature: 0.6,
      max_tokens: 100,
    });

    const result = completion.choices[0].message.content;
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ error: "Failed to generate idea" }, { status: 500 });
  }
}