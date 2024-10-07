import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PDFExtract } from 'pdf.js-extract';
import officegen from 'officegen';
import Tesseract from 'tesseract.js';
import { promises as fs } from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add this interface definition
interface PitchDeckInfo {
  fundingRequirements: string;
  techDetails: string[];
  gtmDetails: string[];
  marketSize: string;
  competitiveAdvantage: string;
  teamInfo: string;
  businessModel: string;
  revenueProjections: string;
  customerBase: string;
  teamSize: string;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScores: { positive: number, negative: number, neutral: number };
  confidenceScore: number;
  techScore: number;
  gtmScore: number;
}

// Add this new interface for feedback
interface Feedback {
  analysisId: string;
  rating: number;
  comments: string;
}

// Helper function to merge arrays without duplicates
function mergeArraysUnique(arr1: string[], arr2: string[]): string[] {
  return arr1.concat(arr2.filter(item => arr1.indexOf(item) < 0));
}

// Add this function to log feedback and analysis results
async function logFeedbackAndAnalysis(feedback: Feedback, analysis: any) {
  const logDir = path.join(process.cwd(), 'logs');
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, 'feedback_and_analysis.json');
  
  let logs = [];
  try {
    const data = await fs.readFile(logFile, 'utf8');
    logs = JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is empty, start with an empty array
  }
  
  logs.push({ feedback, analysis, timestamp: new Date().toISOString() });
  await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
}

// Add this function to dynamically adjust the prompt based on feedback
function adjustPromptBasedOnFeedback(basePrompt: string, recentFeedback: Feedback[]): string {
  let adjustedPrompt = basePrompt;
  
  // Example logic: If recent feedback ratings are low, add more specific instructions
  const averageRating = recentFeedback.reduce((sum, fb) => sum + fb.rating, 0) / recentFeedback.length;
  if (averageRating < 3.5) {
    adjustedPrompt += "\n\nPlease ensure your analysis is more detailed and actionable. Focus on providing specific, data-driven insights and clear, practical recommendations.";
  }
  
  // Add more adjustment logic based on feedback patterns
  
  return adjustedPrompt;
}

export async function POST(req: Request) {
  let pitchDeckProcessed = false;
  let parsedResponse: any;

  try {
    const formData = await req.formData();
    const query = formData.get('query') as string;
    const targetMarket = formData.get('targetMarket') as string;
    const pitchDeckFile = formData.get('pitchDeck') as File | null;

    if (typeof query !== 'string' || typeof targetMarket !== 'string') {
      throw new Error('Invalid query or target market');
    }

    let pitchDeckText = '';
    let pitchDeckProcessed = false;

    if (pitchDeckFile) {
      const fileExtension = pitchDeckFile.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'pdf' || fileExtension === 'pptx') {
        const fileBuffer = await pitchDeckFile.arrayBuffer();
        pitchDeckText = await extractTextFromFile(Buffer.from(fileBuffer), fileExtension);
        pitchDeckProcessed = true;
      } else {
        throw new Error('Invalid file type. Please upload a PDF or PowerPoint file.');
      }
    }

    console.log('Received request:', { query, targetMarket, hasPitchDeck: !!pitchDeckText });

    let pitchDeckInfo: PitchDeckInfo = {
      fundingRequirements: '',
      techDetails: [],
      gtmDetails: [],
      marketSize: '',
      competitiveAdvantage: '',
      teamInfo: '',
      businessModel: '',
      revenueProjections: '',
      customerBase: '',
      teamSize: '',
      overallSentiment: 'neutral',
      sentimentScores: { positive: 0, negative: 0, neutral: 0 },
      confidenceScore: 0,
      techScore: 0,
      gtmScore: 0,
    };

    if (pitchDeckText) {
      console.log('Pitch deck content length:', pitchDeckText.length);
      pitchDeckInfo = await processPitchDeck(pitchDeckText);
      pitchDeckProcessed = true;
      console.log('Processed pitch deck info:', pitchDeckInfo);
    }

    const basePrompt = generatePrompt(query, targetMarket, pitchDeckInfo);
    
    // Get recent feedback to adjust the prompt
    const recentFeedback = await getRecentFeedback(5); // Get last 5 feedback entries
    const adjustedPrompt = adjustPromptBasedOnFeedback(basePrompt, recentFeedback);

    console.log('Generated prompt length:', adjustedPrompt.length);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: adjustedPrompt }],
    });

    let responseContent = completion.choices[0].message.content;
    console.log('OpenAI response length:', responseContent?.length);
    console.log('OpenAI API Answer:', responseContent);

    if (typeof responseContent === 'string') {
      parsedResponse = JSON.parse(responseContent);

      // Ensure investment memo is present
      if (!parsedResponse.investmentMemo) {
        parsedResponse.investmentMemo = {
          summary: "Investment memo not provided by AI. Please review the startup idea and generate a summary.",
          marketOpportunity: "Market opportunity analysis not provided. Review the target market and industry trends.",
          businessModel: "Business model description not provided. Consider how the startup will generate revenue.",
          competitiveAdvantage: "Competitive advantage not specified. Analyze what sets this startup apart from competitors.",
          financialProjections: "Financial projections not provided. Estimate potential revenue and growth based on the market size and business model.",
          fundingRequirements: pitchDeckInfo.fundingRequirements || "Funding requirements not specified. Determine the capital needed to launch and grow the startup."
        };
      }

      // Ensure due diligence sections are present
      if (!parsedResponse.dueDiligenceTech) {
        parsedResponse.dueDiligenceTech = ["Conduct a thorough review of the proposed technology stack", "Assess the scalability of the technical solution", "Evaluate the team's technical expertise"];
      }
      if (!parsedResponse.dueDiligenceGTM) {
        parsedResponse.dueDiligenceGTM = ["Analyze the go-to-market strategy", "Evaluate the customer acquisition plan", "Assess the sales and marketing approach"];
      }
    } else {
      throw new Error('Response content is not a string');
    }

    // Always calculate scores, whether pitch deck was processed or not
    const calculateScore = (details: string[]): number => Number(Math.min(details.length * 0.2, 1).toFixed(2));
    parsedResponse.techScore = pitchDeckProcessed ? pitchDeckInfo.techScore : calculateScore(parsedResponse.dueDiligenceTech || []);
    parsedResponse.gtmScore = pitchDeckProcessed ? pitchDeckInfo.gtmScore : calculateScore(parsedResponse.dueDiligenceGTM || []);
    parsedResponse.confidenceScore = Number(((parsedResponse.techScore + parsedResponse.gtmScore) / 2).toFixed(2));

    console.log('Final scores in response:', {
      confidenceScore: parsedResponse.confidenceScore,
      techScore: parsedResponse.techScore,
      gtmScore: parsedResponse.gtmScore
    });

    parsedResponse.pitchDeckProcessed = pitchDeckProcessed;

    // Log the analysis for monitoring
    await logFeedbackAndAnalysis({ analysisId: 'temp-id', rating: 0, comments: '' }, parsedResponse);

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error in API route:', error);
    if (error instanceof SyntaxError) {
      console.log('Raw OpenAI response:', error.message);
      return NextResponse.json({ error: 'Invalid response from AI model' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add this new endpoint for feedback
export async function PUT(req: Request) {
  const feedback: Feedback = await req.json();
  await logFeedbackAndAnalysis(feedback, {});
  return NextResponse.json({ message: 'Feedback received' });
}

// Add this function to get recent feedback
async function getRecentFeedback(count: number): Promise<Feedback[]> {
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'feedback_and_analysis.json');
  
  try {
    const data = await fs.readFile(logFile, 'utf8');
    const logs = JSON.parse(data);
    return logs.slice(-count).map((log: any) => log.feedback);
  } catch (error) {
    console.error('Error reading feedback logs:', error);
    return [];
  }
}

// Add this function to monitor token usage
function monitorTokenUsage(prompt: string, response: string) {
  const promptTokens = prompt.split(/\s+/).length;
  const responseTokens = response.split(/\s+/).length;
  console.log(`Token usage - Prompt: ${promptTokens}, Response: ${responseTokens}, Total: ${promptTokens + responseTokens}`);
  // You can add logic here to alert if token usage is approaching limits
}

function generatePrompt(query: string, targetMarket: string, pitchDeckInfo: PitchDeckInfo): string {
  let promptText = `
    Analyze the following startup idea and provide a detailed evaluation in JSON format:

    Idea: ${query}
    Target Market: ${targetMarket}

    Additional Information from Pitch Deck:
    - Funding Requirements: ${pitchDeckInfo.fundingRequirements}
    - Technology Details: ${pitchDeckInfo.techDetails.join(', ')}
    - Go-to-Market Strategy: ${pitchDeckInfo.gtmDetails.join(', ')}
    - Market Size: ${pitchDeckInfo.marketSize}
    - Competitive Advantage: ${pitchDeckInfo.competitiveAdvantage}
    - Team Information: ${pitchDeckInfo.teamInfo}
    - Team Size: ${pitchDeckInfo.teamSize}
    - Business Model: ${pitchDeckInfo.businessModel}
    - Revenue Projections: ${pitchDeckInfo.revenueProjections}
    - Customer Base: ${pitchDeckInfo.customerBase}
    - Overall Sentiment: ${pitchDeckInfo.overallSentiment}
    - Sentiment Scores: Positive (${pitchDeckInfo.sentimentScores.positive.toFixed(2)}), Negative (${pitchDeckInfo.sentimentScores.negative.toFixed(2)}), Neutral (${pitchDeckInfo.sentimentScores.neutral.toFixed(2)})

    Based on this information, provide a comprehensive analysis of the startup idea. Your analysis MUST include:

    1. A brief summary of the idea
    2. A detailed SWOT analysis
    3. Critical questions that need to be addressed
    4. An action plan for moving forward
    5. Strategies for targeting the specified market
    6. An analysis of potential competitors
    7. Indicators of market demand
    8. Relevant business frameworks to consider
    9. A global score (0.0 to 1.0) based on the overall potential of the idea
    10. Separate scores for confidence, technology, and go-to-market strategy (each from 0.0 to 1.0)
    11. An investment memo including an executive summary, market opportunity analysis, business model description, competitive advantage analysis, financial projections summary, and funding requirements
    12. Due diligence points for both technology and go-to-market strategy

    It is crucial that you incorporate the information from the pitch deck into your analysis, especially in the investment memo and due diligence sections.

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

    Ensure that your response is a valid JSON object matching this structure. The investmentMemo and dueDiligence sections MUST be included and filled with relevant information based on the provided startup idea and pitch deck details.
  `;

  // Add more dynamic elements to the prompt based on pitchDeckInfo
  if (pitchDeckInfo.fundingRequirements) {
    promptText += `\nPay special attention to the funding requirements: ${pitchDeckInfo.fundingRequirements}`;
  }
  if (pitchDeckInfo.marketSize) {
    promptText += `\nConsider the market size information: ${pitchDeckInfo.marketSize}`;
  }
  
  return promptText;
}

async function processPitchDeck(pitchDeckText: string): Promise<PitchDeckInfo> {
  try {
    const extractInfo = (regex: RegExp, text: string): string[] => {
      const results: string[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        results.push(match[1].trim());
      }
      return results;
    };

    const extractSections = (text: string): { [key: string]: string } => {
      const sectionRegex = /(?:^|\n)((?:--- Slide \d+ ---\n)?[A-Z][A-Za-z\s]+:?)(?:\n|\s*$)([\s\S]*?)(?=\n(?:--- Slide \d+ ---\n)?[A-Z]|$)/gm;
      const sections: { [key: string]: string } = {};
      let match;
      while ((match = sectionRegex.exec(text)) !== null) {
        const key = match[1].replace(/^--- Slide \d+ ---\n/, '').replace(/:$/, '').trim().toLowerCase();
        sections[key] = match[2].trim();
      }
      return sections;
    };

    const sections = extractSections(pitchDeckText);
    console.log('Extracted sections:', Object.keys(sections));

    const fundingRegex = /(?:seeking|raising|need|require)\s*(\$[\d,.]+\s*(?:million|k|M|B|thousand|billion))/i;
    const marketSizeRegex = /(?:market size|tam|total addressable market)\s*(?:of|is|:)?\s*(\$[\d,.]+\s*(?:million|k|M|B|thousand|billion))/i;
    const revenueProjectionRegex = /(?:projected|expected|anticipated)\s*revenue\s*(?:of|:)?\s*(\$[\d,.]+\s*(?:million|k|M|B|thousand|billion)(?:\s*(?:in|by)\s*\d{4})?)/i;
    const customerBaseRegex = /(?:current|existing|potential)\s*customer\s*base\s*(?:of|:)?\s*([\d,]+\+?)/i;
    const teamSizeRegex = /team\s*(?:of|with)\s*([\d,]+)\s*(?:members|employees|people)/i;

    const fundingRequirements = extractInfo(fundingRegex, pitchDeckText).join(', ') || 'No specific funding requirements found';
    const techDetails = sections['technology'] ? sections['technology'].split('\n').map(s => s.trim()) : ['No specific tech details found'];
    const gtmDetails = sections['go-to-market'] ? sections['go-to-market'].split('\n').map(s => s.trim()) : ['No specific GTM details found'];
    const marketSize = extractInfo(marketSizeRegex, pitchDeckText).join(', ') || 'Market size not specified';
    const competitiveAdvantage = sections['competitive advantage'] || 'Competitive advantage not specified';
    const teamInfo = sections['team'] || 'Team information not provided';
    const businessModel = sections['business model'] || 'Business model not specified';
    const revenueProjections = extractInfo(revenueProjectionRegex, pitchDeckText).join(', ') || 'Revenue projections not specified';
    const customerBase = extractInfo(customerBaseRegex, pitchDeckText).join(', ') || 'Customer base not specified';
    const teamSize = extractInfo(teamSizeRegex, pitchDeckText).join(', ') || 'Team size not specified';

    console.log('Extracted information:', {
      fundingRequirements,
      marketSize,
      revenueProjections,
      customerBase,
      teamSize
    });

    // More sophisticated sentiment analysis
    const sentimentAnalysis = await performSentimentAnalysis(pitchDeckText);

    const calculateScore = (details: string[]): number => {
      const baseScore = details.length > 0 ? 0.5 : 0;
      const bonus = Math.min(details.length * 0.1, 0.5);
      return Number((baseScore + bonus).toFixed(2));
    };

    const techScore = calculateScore(techDetails);
    const gtmScore = calculateScore(gtmDetails);
    const confidenceScore = Number(((techScore + gtmScore) / 2).toFixed(2));

    console.log('Calculated scores:', { techScore, gtmScore, confidenceScore });

    return {
      fundingRequirements,
      techDetails,
      gtmDetails,
      marketSize,
      competitiveAdvantage,
      teamInfo,
      businessModel,
      revenueProjections,
      customerBase,
      teamSize,
      overallSentiment: sentimentAnalysis.overallSentiment,
      sentimentScores: sentimentAnalysis.sentimentScores,
      confidenceScore,
      techScore,
      gtmScore,
    };
  } catch (error) {
    console.error('Error processing pitch deck:', error);
    return {
      fundingRequirements: '',
      techDetails: ['Error processing pitch deck'],
      gtmDetails: ['Error processing pitch deck'],
      marketSize: 'Error processing pitch deck',
      competitiveAdvantage: 'Error processing pitch deck',
      teamInfo: 'Error processing pitch deck',
      businessModel: 'Error processing pitch deck',
      revenueProjections: 'Error processing pitch deck',
      customerBase: 'Error processing pitch deck',
      teamSize: 'Error processing pitch deck',
      overallSentiment: 'neutral',
      sentimentScores: { positive: 0, negative: 0, neutral: 0 },
      confidenceScore: 0,
      techScore: 0,
      gtmScore: 0,
    };
  }
}

async function performSentimentAnalysis(text: string): Promise<{ overallSentiment: 'positive' | 'neutral' | 'negative', sentimentScores: { positive: number, negative: number, neutral: number } }> {
  // This is a placeholder. In a real-world scenario, you'd use a proper NLP library or API for sentiment analysis.
  const positiveWords = ['innovative', 'growth', 'opportunity', 'leading', 'unique', 'efficient', 'scalable', 'profitable', 'success'];
  const negativeWords = ['challenge', 'risk', 'difficult', 'uncertain', 'competitive', 'costly', 'problem', 'threat'];

  const wordCount = text.split(/\s+/).length;
  const positiveCount = positiveWords.reduce((count, word) => count + ((text.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length), 0);
  const negativeCount = negativeWords.reduce((count, word) => count + ((text.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length), 0);
  const neutralCount = wordCount - positiveCount - negativeCount;

  const positiveScore = positiveCount / wordCount;
  const negativeScore = negativeCount / wordCount;
  const neutralScore = neutralCount / wordCount;

  let overallSentiment: 'positive' | 'neutral' | 'negative';
  if (positiveScore > negativeScore && positiveScore > neutralScore) {
    overallSentiment = 'positive';
  } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
    overallSentiment = 'negative';
  } else {
    overallSentiment = 'neutral';
  }

  return {
    overallSentiment,
    sentimentScores: {
      positive: positiveScore,
      negative: negativeScore,
      neutral: neutralScore,
    },
  };
}

async function extractTextFromFile(buffer: Buffer, fileExtension: string): Promise<string> {
  if (fileExtension === 'pdf') {
    return await extractTextFromPDF(buffer);
  } else if (fileExtension === 'pptx') {
    return await extractTextFromPPTX(buffer);
  }
  throw new Error('Unsupported file type');
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfExtract = new PDFExtract();
  const options = {};
  
  try {
    const data = await pdfExtract.extractBuffer(buffer, options);
    let text = '';
    for (const page of data.pages) {
      for (const content of page.content) {
        text += content.str + ' ';
      }
      text += '\n\n';
    }
    
    // If the extracted text is too short, it might be an image-based PDF
    if (text.length < 100) {
      console.log('PDF seems to be image-based. Attempting OCR...');
      return await performOCR(buffer);
    }
    
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return await performOCR(buffer);
  }
}

async function extractTextFromPPTX(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pptx = officegen('pptx');
    pptx.on('error', reject);

    pptx.load(buffer, async (err: Error | null) => {
      if (err) {
        reject(err);
        return;
      }

      let text = '';
      const slides = pptx.getSlides();
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        text += `\n--- Slide ${i + 1} ---\n`;
        
        // Extract text from all elements in the slide
        if (typeof slide === 'object' && slide !== null) {
          Object.keys(slide).forEach(key => {
            const element = (slide as any)[key];
            if (typeof element === 'object' && element !== null) {
              if (element.options) {
                if (element.options.title) {
                  text += `Title: ${element.options.title}\n`;
                }
                if (element.options.text) {
                  text += `${element.options.text}\n`;
                }
              }
              // Check for images
              if (element.type === 'image' && element.image) {
                console.log('Found image in PowerPoint. Attempting OCR...');
                const imageBuffer = Buffer.from(element.image, 'base64');
                performOCR(imageBuffer).then(ocrText => {
                  text += `Image content: ${ocrText}\n`;
                }).catch(error => {
                  console.error('Error performing OCR:', error);
                });
              }
            }
          });
        }
      }

      resolve(text);
    });
  });
}

async function performOCR(buffer: Buffer): Promise<string> {
  try {
    const worker = await Tesseract.createWorker('eng');
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return text;
  } catch (error) {
    console.error('Error performing OCR:', error);
    return 'OCR failed to extract text from image';
  }
}