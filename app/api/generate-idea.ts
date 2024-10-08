import { NextApiRequest, NextApiResponse } from 'next';
import { analyzeText, AnalysisResult } from './textAnalyzer';
import { IncomingForm } from 'formidable';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import officegen from 'officegen';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const form = new IncomingForm();

      const formData = await new Promise<{ fields: any, files: any }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      const { fields, files } = formData;

      const query = Array.isArray(fields.query) ? fields.query[0] : fields.query;
      const targetMarket = Array.isArray(fields.targetMarket) ? fields.targetMarket[0] : fields.targetMarket;

      if (typeof query !== 'string' || typeof targetMarket !== 'string') {
        throw new Error('Invalid query or target market');
      }

      let pitchDeckText = '';
      let pitchDeckProcessed = false;

      if (files.pitchDeck && !Array.isArray(files.pitchDeck)) {
        const pitchDeckFile = files.pitchDeck;
        const fileExtension = pitchDeckFile.originalFilename?.split('.').pop()?.toLowerCase();

        if (fileExtension === 'pdf' || fileExtension === 'pptx') {
          const fileBuffer = await fs.readFile(pitchDeckFile.filepath);

          if (fileExtension === 'pdf') {
            const pdfData = await pdfParse(fileBuffer);
            pitchDeckText = pdfData.text;
          } else if (fileExtension === 'pptx') {
            pitchDeckText = await extractTextFromPPTX(fileBuffer);
          }

          pitchDeckProcessed = true;
        } else {
          throw new Error('Invalid file type. Please upload a PDF or PowerPoint file.');
        }
      }

      const analysis: AnalysisResult = await analyzeText(query, targetMarket, pitchDeckText);

      if (pitchDeckProcessed) {
        const fundingRequirements = extractFundingRequirements(pitchDeckText);
        if (fundingRequirements) {
          analysis.investmentMemo.fundingRequirements = fundingRequirements;
        }

        // Extract other relevant information from the pitch deck
        analysis.investmentMemo.summary = extractRelevantInfo(pitchDeckText, 'summary') || analysis.investmentMemo.summary;
        analysis.investmentMemo.marketOpportunity = extractRelevantInfo(pitchDeckText, 'market opportunity') || analysis.investmentMemo.marketOpportunity;
        analysis.investmentMemo.businessModel = extractRelevantInfo(pitchDeckText, 'business model') || analysis.investmentMemo.businessModel;
        analysis.investmentMemo.competitiveAdvantage = extractRelevantInfo(pitchDeckText, 'competitive advantage') || analysis.investmentMemo.competitiveAdvantage;
        analysis.investmentMemo.financialProjections = extractRelevantInfo(pitchDeckText, 'financial projections') || analysis.investmentMemo.financialProjections;
      }

      analysis.pitchDeckProcessed = pitchDeckProcessed;

      res.status(200).json(analysis);
    } catch (error) {
      console.error('Error processing request:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Error processing request' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function extractTextFromPPTX(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pptx = officegen('pptx');
    pptx.on('error', reject);

    pptx.load(buffer, (err: Error | null) => {
      if (err) {
        reject(err);
        return;
      }

      let text = '';
      pptx.getSlides().forEach((slide: any) => {
        if (slide.getTexts) {
          slide.getTexts().forEach((textItem: any) => {
            text += textItem.text + '\n';
          });
        }
      });

      resolve(text);
    });
  });
}

function extractFundingRequirements(text: string): string | null {
  const fundingRegex = /(?:seeking|looking for|require|need).*?(\$[\d,.]+\s*(?:million|k|M|B|thousand|billion))/i;
  const match = text.match(fundingRegex);
  return match ? match[1] : null;
}

function extractRelevantInfo(text: string, section: string): string | null {
  const sectionRegex = new RegExp(`${section}[:\\s]+(.*?)(?=\\n\\n|$)`, 'is');
  const match = text.match(sectionRegex);
  return match ? match[1].trim() : null;
}