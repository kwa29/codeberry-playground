'use client';

import { useState, useCallback, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';

// Add this list of target markets
const targetMarkets = [
  'Small Businesses',
  'Enterprise Companies',
  'Consumers',
  'Students',
  'Freelancers',
  'Healthcare Providers',
  'Educational Institutions',
  'Non-profit Organizations',
  'Government Agencies',
  'Tech Startups'
];

interface ValidatedIdea {
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
  pitchDeckProcessed: boolean;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScores: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

const defaultInvestmentMemo = {
  summary: "Your startup idea has potential. Consider expanding on your unique value proposition and how it addresses a specific market need.",
  marketOpportunity: "Analyze your target market size, growth rate, and any emerging trends that your startup can capitalize on.",
  businessModel: "Outline how your startup will generate revenue. Consider various monetization strategies and how they align with your target market.",
  competitiveAdvantage: "Identify what sets your startup apart from existing solutions. This could be innovative technology, unique features, or a novel approach to solving a problem.",
  financialProjections: "Develop realistic financial projections for the next 3-5 years. Include expected revenue, costs, and potential profitability milestones.",
  fundingRequirements: "Estimate the amount of funding needed to reach key milestones. Break down how the funds will be used across different areas of your startup."
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [pitchDeck, setPitchDeck] = useState<File | null>(null);
  const [validatedIdea, setValidatedIdea] = useState<ValidatedIdea | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'pdf' || fileExtension === 'pptx') {
        setPitchDeck(file);
        setFileName(file.name);
        setError(null);
      } else {
        setPitchDeck(null);
        setFileName(null);
        setError('Please upload a PDF or PowerPoint file.');
      }
    } else {
      setPitchDeck(null);
      setFileName(null);
    }
  };

  const generateAndValidateIdea = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    try {
      setProgress(25);
      const formData = new FormData();
      formData.append('query', query);
      formData.append('targetMarket', targetMarket);
      if (pitchDeck) {
        formData.append('pitchDeck', pitchDeck);
      }

      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        body: formData,
      });
      setProgress(50);
      
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        console.error('Raw response:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      console.log('API Response:', data); // Add this line for debugging

      if (response.status !== 200) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      setProgress(75);
      setValidatedIdea(data);
      setProgress(100);
    } catch (error: unknown) {
      console.error('Error:', error);
      if (error instanceof Error) {
        setError(`An error occurred while generating and validating the idea: ${error.message}. Please try again.`);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generateAndValidateIdea();
  };

  const handleShare = async () => {
    if (!validatedIdea) return;

    const shareText = `Check out my startup idea: ${validatedIdea.idea}\n\nStrengths: ${validatedIdea.swot.strengths.join(', ')}\nWeaknesses: ${validatedIdea.swot.weaknesses.join(', ')}\nOpportunities: ${validatedIdea.swot.opportunities.join(', ')}\nThreats: ${validatedIdea.swot.threats.join(', ')}\n\nAction Plan: ${validatedIdea.actionPlan.join(', ')}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Startup Idea',
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Summary copied to clipboard!');
      }, (err) => {
        console.error('Could not copy text: ', err);
      });
    }
  };

  useEffect(() => {
    if (validatedIdea) {
      console.log('Received scores:', {
        confidenceScore: validatedIdea.confidenceScore,
        techScore: validatedIdea.techScore,
        gtmScore: validatedIdea.gtmScore
      });
    }
  }, [validatedIdea]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-100">
      <h1 className="text-4xl font-bold mb-8 text-center">Startup Idea Validator 🚀</h1>
      
      {!validatedIdea && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="idea" className="block text-sm font-medium text-gray-700">Your business idea</label>
              <textarea
                id="idea"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your startup idea in detail"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                rows={3}
                required
              />
            </div>
            <div>
              <label htmlFor="market" className="block text-sm font-medium text-gray-700">Target market</label>
              <select
                id="market"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              >
                <option value="" disabled>Select a target market</option>
                {targetMarkets.map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pitchDeck" className="block text-sm font-medium text-gray-700">Upload Pitch Deck (PDF or PowerPoint)</label>
              <input
                type="file"
                id="pitchDeck"
                onChange={handleFileChange}
                accept=".pdf,.pptx"
                className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
              />
              {fileName && (
                <p className="mt-2 text-sm text-gray-500">
                  Selected file: {fileName}
                </p>
              )}
              {error && (
                <p className="mt-2 text-sm text-red-500">
                  {error}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Validating...' : 'Validate Idea'}
            </button>
          </form>
        </div>
      )}

      {isLoading && (
        <div className="w-full max-w-md mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Validating your idea...</h2>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="mt-2 text-sm text-gray-600">This may take up to 20 seconds</p>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {validatedIdea && (
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold mb-6 text-center">Your startup idea has been assessed! 🔍</h2>
          <p className="text-center text-gray-600 mb-8">Here's a summary of your startup's potential and actionable steps to move forward.</p>
          
          {/* Global Score */}
          <div className="flex justify-center items-center mb-8">
            <div className="bg-indigo-600 text-white text-2xl font-bold rounded-full w-24 h-24 flex items-center justify-center">
              {(() => {
                const techScore = validatedIdea.techScore ?? 0;
                const gtmScore = validatedIdea.gtmScore ?? 0;
                const confidenceScore = validatedIdea.confidenceScore ?? 0;
                const globalScore = (techScore + gtmScore + confidenceScore) / 3;
                return globalScore.toFixed(1);
              })()}
            </div>
          </div>
          
          {/* Individual Scores */}
          <div className="flex justify-center items-center mb-8 space-x-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Confidence</p>
              <p className="text-lg font-semibold">
                {validatedIdea.confidenceScore !== undefined ? validatedIdea.confidenceScore.toFixed(1) : '0.0'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Tech</p>
              <p className="text-lg font-semibold">
                {validatedIdea.techScore !== undefined ? validatedIdea.techScore.toFixed(1) : '0.0'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">GTM</p>
              <p className="text-lg font-semibold">
                {validatedIdea.gtmScore !== undefined ? validatedIdea.gtmScore.toFixed(1) : '0.0'}
              </p>
            </div>
          </div>
          
          {/* Score Explanation */}
          <div className="text-center mb-8">
            <p className="text-sm text-gray-600">
              Scores range from 0 to 1, with 1 being the highest. The global score is an average of Confidence, Tech, and GTM scores.
            </p>
          </div>

          <div className="flex justify-between mb-8">
            <button onClick={() => setValidatedIdea(null)} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
              Validate another idea
            </button>
            <button onClick={handleShare} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
              Share
            </button>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">SWOT Analysis</h3>
            <p className="text-gray-600 mb-4">SWOT Analysis is a key tool for evaluating your startup's potential. It reveals your Strengths to leverage, Weaknesses to improve, Opportunities to capture, and Threats to watch out for. This clear, strategic insight is crucial for making informed decisions and guiding your business towards success.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-100 p-4 rounded-md">
                <h4 className="font-bold text-blue-700 mb-2">Strengths</h4>
                {validatedIdea.swot.strengths && validatedIdea.swot.strengths.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {validatedIdea.swot.strengths.map((strength, index) => (
                      <li key={index}>{strength}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No strengths identified.</p>
                )}
              </div>
              <div className="bg-yellow-100 p-4 rounded-md">
                <h4 className="font-bold text-yellow-700 mb-2">Weaknesses</h4>
                {validatedIdea.swot.weaknesses && validatedIdea.swot.weaknesses.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {validatedIdea.swot.weaknesses.map((weakness, index) => (
                      <li key={index}>{weakness}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No weaknesses identified.</p>
                )}
              </div>
              <div className="bg-green-100 p-4 rounded-md">
                <h4 className="font-bold text-green-700 mb-2">Opportunities</h4>
                {validatedIdea.swot.opportunities && validatedIdea.swot.opportunities.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {validatedIdea.swot.opportunities.map((opportunity, index) => (
                      <li key={index}>{opportunity}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No opportunities identified.</p>
                )}
              </div>
              <div className="bg-red-100 p-4 rounded-md">
                <h4 className="font-bold text-red-700 mb-2">Threats</h4>
                {validatedIdea.swot.threats && validatedIdea.swot.threats.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {validatedIdea.swot.threats.map((threat, index) => (
                      <li key={index}>{threat}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No threats identified.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">💼 Investment Memo</h3>
            <p className="text-gray-600 mb-4">A comprehensive analysis of the investment potential for this startup idea.</p>
            {validatedIdea.pitchDeckProcessed && (
              <p className="text-indigo-600 mb-4">This analysis includes information from your provided pitch deck.</p>
            )}
            <div className="bg-gray-100 p-6 rounded-md">
              {validatedIdea.investmentMemo && Object.values(validatedIdea.investmentMemo).some(value => value) ? (
                <>
                  <h4 className="text-xl font-semibold mb-3">Executive Summary</h4>
                  <p className="mb-4">{validatedIdea.investmentMemo.summary || defaultInvestmentMemo.summary}</p>

                  <h4 className="text-xl font-semibold mb-3">Market Opportunity</h4>
                  <p className="mb-4">{validatedIdea.investmentMemo.marketOpportunity || defaultInvestmentMemo.marketOpportunity}</p>

                  <h4 className="text-xl font-semibold mb-3">Business Model</h4>
                  <p className="mb-4">{validatedIdea.investmentMemo.businessModel || defaultInvestmentMemo.businessModel}</p>

                  <h4 className="text-xl font-semibold mb-3">Competitive Advantage</h4>
                  <p className="mb-4">{validatedIdea.investmentMemo.competitiveAdvantage || defaultInvestmentMemo.competitiveAdvantage}</p>

                  <h4 className="text-xl font-semibold mb-3">Financial Projections</h4>
                  <p className="mb-4">{validatedIdea.investmentMemo.financialProjections || defaultInvestmentMemo.financialProjections}</p>

                  <h4 className="text-xl font-semibold mb-3">Funding Requirements</h4>
                  {validatedIdea.investmentMemo.fundingRequirements ? (
                    <p className="mb-4">
                      <span className="font-semibold">From Pitch Deck: </span>
                      {validatedIdea.investmentMemo.fundingRequirements}
                    </p>
                  ) : (
                    <p className="mb-4">{defaultInvestmentMemo.fundingRequirements}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">No specific investment memo is available for this idea yet. Here are some key points to consider as you develop your investment strategy:</p>
                  <div className="space-y-4">
                    {Object.entries(defaultInvestmentMemo).map(([key, value]) => (
                      <div key={key} className="border-l-4 border-indigo-500 pl-4">
                        <h4 className="text-lg font-semibold mb-2">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}</h4>
                        <p className="text-gray-700">{value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">Critical Questions</h3>
            {validatedIdea.criticalQuestions && validatedIdea.criticalQuestions.length > 0 ? (
              <ul className="list-disc pl-5">
                {validatedIdea.criticalQuestions.map((question, index) => (
                  <li key={index} className="mb-2">{question}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No critical questions available.</p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">🔬 Due Diligence: Tech</h3>
            <p className="text-gray-600 mb-4">Technical aspects to consider and validate for this startup idea.</p>
            {validatedIdea.dueDiligenceTech && validatedIdea.dueDiligenceTech.length > 0 ? (
              <ul className="list-disc pl-5">
                {validatedIdea.dueDiligenceTech.map((item, index) => (
                  <li key={index} className="mb-2">{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No technical due diligence points available.</p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">🚀 Due Diligence: Go-to-Market (GTM)</h3>
            <p className="text-gray-600 mb-4">Market-related aspects to consider and validate for this startup idea.</p>
            {validatedIdea.dueDiligenceGTM && validatedIdea.dueDiligenceGTM.length > 0 ? (
              <ul className="list-disc pl-5">
                {validatedIdea.dueDiligenceGTM.map((item, index) => (
                  <li key={index} className="mb-2">{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No GTM due diligence points available.</p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">📊 5 Ways to Reach Your Target Market</h3>
            <p className="text-gray-600 mb-4">Strategies to connect with and engage your target audience, crucial for your startup's market penetration.</p>
            {validatedIdea.targetMarketStrategies && validatedIdea.targetMarketStrategies.length > 0 ? (
              <ol className="list-decimal pl-5">
                {validatedIdea.targetMarketStrategies.map((strategy, index) => (
                  <li key={index} className="mb-2">{strategy}</li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-600">No target market strategies available.</p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">🏆 Competition or Similar Players to Keep in Mind</h3>
            <p className="text-gray-600 mb-4">Understand your competitive landscape. Knowing your rivals helps in positioning your startup strategically in the market.</p>
            {validatedIdea.competition && validatedIdea.competition.length > 0 ? (
              <ul className="list-disc pl-5">
                {validatedIdea.competition.map((competitor, index) => (
                  <li key={index} className="mb-2">{competitor}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No competition data available.</p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">🚀 Your Action Plan</h3>
            <p className="text-gray-600 mb-4">Actionable steps to move your startup idea from concept to reality and bring you closer to 100K MRR🤑.</p>
            {validatedIdea.actionPlan && validatedIdea.actionPlan.length > 0 ? (
              <ol className="list-decimal pl-5">
                {validatedIdea.actionPlan.map((step, index) => (
                  <li key={index} className="mb-2">{step}</li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-600">No action plan available.</p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">📈 Market Demand Indicators</h3>
            <p className="text-gray-600 mb-4">Key signals that suggest a strong market need for your startup. These indicators can guide your strategy to align with market demand.</p>
            {validatedIdea.marketDemandIndicators && validatedIdea.marketDemandIndicators.length > 0 ? (
              <ul className="list-disc pl-5">
                {validatedIdea.marketDemandIndicators.map((indicator, index) => (
                  <li key={index} className="mb-2">{indicator}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No market demand indicators available.</p>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">📚 Frameworks to Evaluate</h3>
            <p className="text-gray-600 mb-4">Strategic frameworks to critically assess and enhance your startup's approach and business model.</p>
            {validatedIdea.frameworks && validatedIdea.frameworks.length > 0 ? (
              <ul className="list-disc pl-5">
                {validatedIdea.frameworks.map((framework, index) => (
                  <li key={index} className="mb-2">{framework}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No frameworks available.</p>
            )}
          </div>

          <div className="text-center">
            <a
              href="https://codeberry.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 text-lg font-semibold"
            >
              Start Building Your Startup
            </a>
          </div>
        </div>
      )}
    </div>
  );
}