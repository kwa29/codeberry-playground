import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      error: {
        message: "OpenAI API key not configured",
      }
    }, { status: 500 });
  }

  try {
    const { query } = await req.json();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {"role": "system", "content": "You are a helpful assistant that generates startup ideas."},
        {"role": "user", "content": generatePrompt(query)}
      ],
      temperature: 0.6,
      max_tokens: 100,
    });
    return NextResponse.json({ result: completion.choices[0].message.content });
  } catch(error: any) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return NextResponse.json(error.response.data, { status: error.response.status });
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return NextResponse.json({
        error: {
          message: 'An error occurred during your request.',
        }
      }, { status: 500 });
    }
  }
}

function generatePrompt(query: string) {
  return `Generate a startup idea based on the following keywords: ${query}`;
}