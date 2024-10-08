'use client';

import { useState, useEffect, useCallback } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { CSVLink } from 'react-csv';

ChartJS.register(ArcElement, Tooltip, Legend);

// Remove the targetMarkets array as we're no longer using it

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
  investmentMemoScores: {
    summary: number;
    marketOpportunity: number;
    businessModel: number;
    competitiveAdvantage: number;
    financialProjections: number;
    fundingRequirements: number;
  };
  dueDiligenceTech: { point: string; score: number }[];
  dueDiligenceGTM: { point: string; score: number }[];
  pitchDeckProcessed: boolean;
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentScores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  industryAverages: IndustryAverages;
}

const defaultInvestmentMemo = {
  summary: "Your startup idea has potential. Consider expanding on your unique value proposition and how it addresses a specific market need.",
  marketOpportunity: "Analyze your target market size, growth rate, and any emerging trends that your startup can capitalize on.",
  businessModel: "Outline how your startup will generate revenue. Consider various monetization strategies and how they align with your target market.",
  competitiveAdvantage: "Identify what sets your startup apart from existing solutions. This could be innovative technology, unique features, or a novel approach to solving a problem.",
  financialProjections: "Develop realistic financial projections for the next 3-5 years. Include expected revenue, costs, and potential profitability milestones.",
  fundingRequirements: "Estimate the amount of funding needed to reach key milestones. Break down how the funds will be used across different areas of your startup."
};

// Add this new interface for saved analyses
interface SavedAnalysis {
  id: string;
  date: string;
  idea: string;
  globalScore: number;
}

interface IndustryAverages {
  averageFunding: string;
  averageTimeToMarket: string;
  averageCAC: string;
  averageLTV: string;
  averageBurnRate: string;
  averageRevenueGrowth: string;
}

function getScoreColor(score: number): string {
  if (score <= 33.33) {
    return 'text-red-500';
  } else if (score <= 66.66) {
    return 'text-yellow-500';
  } else {
    return 'text-green-500';
  }
}

export default function Home() {
  const [query, setQuery] = useState('');
  // Remove the targetMarket state
  const [pitchDeck, setPitchDeck] = useState<File | null>(null);
  const [validatedIdea, setValidatedIdea] = useState<ValidatedIdea | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [sortField, setSortField] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterScore, setFilterScore] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback((file: File | null) => {
    if (file) {
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
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, [handleFileChange]);

  const generateAndValidateIdea = async (retryCount = 0) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    try {
      setProgress(25);
      const formData = new FormData();
      formData.append('query', query);
      if (pitchDeck) {
        formData.append('pitchDeck', pitchDeck);
      }

      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        body: formData,
      });
      setProgress(50);
      
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Check if scores are all zero
      const allScoresZero = 
        data.globalScore === 0 && 
        data.confidenceScore === 0 && 
        data.techScore === 0 && 
        data.gtmScore === 0;

      if (allScoresZero && retryCount < 1) {
        console.log('All scores are zero. Retrying...');
        return generateAndValidateIdea(retryCount + 1);
      }

      // Process data and set state
      const processedData = {
        ...data,
        globalScore: data.globalScore ?? 0,
        confidenceScore: data.confidenceScore ?? 0,
        techScore: data.techScore ?? 0,
        gtmScore: data.gtmScore ?? 0,
        dueDiligenceTech: data.dueDiligenceTech ?? [],
        dueDiligenceGTM: data.dueDiligenceGTM ?? [],
        investmentMemoScores: data.investmentMemoScores ?? {},
      };

      setValidatedIdea(processedData);
      setProgress(100);
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while processing your request.');
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

  useEffect(() => {
    // Load saved analyses from localStorage
    const savedAnalysesString = localStorage.getItem('savedAnalyses');
    if (savedAnalysesString) {
      setSavedAnalyses(JSON.parse(savedAnalysesString));
    }
  }, []);

  const saveAnalysis = () => {
    if (validatedIdea) {
      const newAnalysis: SavedAnalysis = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        idea: validatedIdea.idea,
        globalScore: validatedIdea.globalScore,
      };
      const updatedAnalyses = [...savedAnalyses, newAnalysis];
      setSavedAnalyses(updatedAnalyses);
      localStorage.setItem('savedAnalyses', JSON.stringify(updatedAnalyses));
    }
  };

  const deleteAnalysis = (id: string) => {
    const updatedAnalyses = savedAnalyses.filter(analysis => analysis.id !== id);
    setSavedAnalyses(updatedAnalyses);
    localStorage.setItem('savedAnalyses', JSON.stringify(updatedAnalyses));
  };

  const sortedAndFilteredAnalyses = savedAnalyses
    .filter(analysis => filterScore === null || analysis.globalScore >= filterScore)
    .sort((a, b) => {
      if (sortField === 'date') {
        return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      } else {
        return sortOrder === 'asc' ? a.globalScore - b.globalScore : b.globalScore - a.globalScore;
      }
    });

  const chartData = {
    labels: ['Tech', 'GTM', 'Confidence'],
    datasets: [
      {
        data: [validatedIdea?.techScore || 0, validatedIdea?.gtmScore || 0, validatedIdea?.confidenceScore || 0],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
        hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      },
    ],
  };

  const csvData = sortedAndFilteredAnalyses.map(analysis => ({
    Date: new Date(analysis.date).toLocaleDateString(),
    Idea: analysis.idea,
    'Global Score': analysis.globalScore.toFixed(1) + '%',
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Startup Idea Validator</h1>
      
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              Describe your startup idea
            </label>
            <textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none"
              rows={4}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="pitchDeck" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Pitch Deck (optional)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="pitchDeck"
                onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                className="hidden"
                accept=".pdf,.pptx"
              />
              <label htmlFor="pitchDeck" className="cursor-pointer">
                {fileName ? (
                  <span className="text-blue-500">{fileName}</span>
                ) : (
                  <span>
                    Drag and drop your pitch deck here, or <span className="text-blue-500">click to select a file</span>
                  </span>
                )}
              </label>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Startup Idea'}
          </button>
        </form>

        {isLoading && (
          <div className="mb-8">
            <p className="text-center">Analyzing your startup idea...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {validatedIdea && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-3xl font-bold mb-6 text-center">Your startup idea has been assessed! 🔍</h2>
            <p className="text-center text-gray-600 mb-8">Here's a summary of your startup's potential and actionable steps to move forward.</p>
            
            {/* Global Score */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold mb-2">Global Score</h3>
              <p className={`text-4xl font-bold ${getScoreColor(validatedIdea.globalScore)}`}>
                {validatedIdea.globalScore.toFixed(1)}%
              </p>
            </div>
            
            {/* Individual Scores */}
            <div className="flex justify-center items-center mb-8 space-x-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Confidence</p>
                <p className="text-lg font-semibold">
                  {validatedIdea.confidenceScore.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Tech</p>
                <p className="text-lg font-semibold">
                  {validatedIdea.techScore.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">GTM</p>
                <p className="text-lg font-semibold">
                  {validatedIdea.gtmScore.toFixed(1)}%
                </p>
              </div>
            </div>
            
            {/* Score Explanation */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-600">
                Scores range from 0% to 100%, with 100% being the highest. The global score is a weighted average of Confidence, Tech, and GTM scores.
              </p>
            </div>

            <div className="flex justify-between mb-8">
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
                <>
                  <h4 className="text-xl font-semibold mb-3">Executive Summary</h4>
                  <p className="mb-2">{validatedIdea.investmentMemo.summary || defaultInvestmentMemo.summary}</p>
                  <p className="text-sm text-gray-600 mb-4">Score: {validatedIdea.investmentMemoScores.summary.toFixed(1)}%</p>

                  <h4 className="text-xl font-semibold mb-3">Market Opportunity</h4>
                  <p className="mb-2">{validatedIdea.investmentMemo.marketOpportunity || defaultInvestmentMemo.marketOpportunity}</p>
                  <p className="text-sm text-gray-600 mb-4">Score: {validatedIdea.investmentMemoScores.marketOpportunity.toFixed(1)}%</p>

                  <h4 className="text-xl font-semibold mb-3">Business Model</h4>
                  <p className="mb-2">{validatedIdea.investmentMemo.businessModel || defaultInvestmentMemo.businessModel}</p>
                  <p className="text-sm text-gray-600 mb-4">Score: {validatedIdea.investmentMemoScores.businessModel.toFixed(1)}%</p>

                  <h4 className="text-xl font-semibold mb-3">Competitive Advantage</h4>
                  <p className="mb-2">{validatedIdea.investmentMemo.competitiveAdvantage || defaultInvestmentMemo.competitiveAdvantage}</p>
                  <p className="text-sm text-gray-600 mb-4">Score: {validatedIdea.investmentMemoScores.competitiveAdvantage.toFixed(1)}%</p>

                  <h4 className="text-xl font-semibold mb-3">Financial Projections</h4>
                  <p className="mb-2">{validatedIdea.investmentMemo.financialProjections || defaultInvestmentMemo.financialProjections}</p>
                  <p className="text-sm text-gray-600 mb-4">Score: {validatedIdea.investmentMemoScores.financialProjections.toFixed(1)}%</p>

                  <h4 className="text-xl font-semibold mb-3">Funding Requirements</h4>
                  <p className="mb-2">{validatedIdea.investmentMemo.fundingRequirements || defaultInvestmentMemo.fundingRequirements}</p>
                  <p className="text-sm text-gray-600 mb-4">Score: {validatedIdea.investmentMemoScores.fundingRequirements.toFixed(1)}%</p>
                </>
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
                    <li key={index} className="mb-2">
                      {item.point} - Score: {item.score}%
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No technical due diligence points available.</p>
              )}
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-4">🚀 Due Diligence: Go-to-Market</h3>
              <p className="text-gray-600 mb-4">Go-to-market strategies and considerations for this startup idea.</p>
              {validatedIdea.dueDiligenceGTM && validatedIdea.dueDiligenceGTM.length > 0 ? (
                <ul className="list-disc pl-5">
                  {validatedIdea.dueDiligenceGTM.map((item, index) => (
                    <li key={index} className="mb-2">
                      {item.point} - Score: {item.score}%
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No go-to-market due diligence points available.</p>
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

            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-4">Score Breakdown</h3>
              <div className="w-64 h-64 mx-auto">
                <Pie data={chartData} />
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-2xl font-semibold mb-4">Industry Averages</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Average Funding:</p>
                  <p>{validatedIdea.industryAverages.averageFunding}</p>
                </div>
                <div>
                  <p className="font-semibold">Average Time to Market:</p>
                  <p>{validatedIdea.industryAverages.averageTimeToMarket}</p>
                </div>
                <div>
                  <p className="font-semibold">Average CAC:</p>
                  <p>{validatedIdea.industryAverages.averageCAC}</p>
                </div>
                <div>
                  <p className="font-semibold">Average LTV:</p>
                  <p>{validatedIdea.industryAverages.averageLTV}</p>
                </div>
                <div>
                  <p className="font-semibold">Average Burn Rate:</p>
                  <p>{validatedIdea.industryAverages.averageBurnRate}</p>
                </div>
                <div>
                  <p className="font-semibold">Average Revenue Growth:</p>
                  <p>{validatedIdea.industryAverages.averageRevenueGrowth}</p>
                </div>
              </div>
            </div>

            <button onClick={saveAnalysis} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mb-4">
              Save Analysis
            </button>

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

        {savedAnalyses.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h3 className="text-2xl font-semibold mb-4">Saved Analyses</h3>
            <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="mb-4 md:mb-0">
                <label className="mr-2">Sort by:</label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as 'date' | 'score')}
                  className="mr-2 p-2 border rounded"
                >
                  <option value="date">Date</option>
                  <option value="score">Score</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="p-2 border rounded"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
              <div>
                <label className="mr-2">Filter by minimum score:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filterScore || ''}
                  onChange={(e) => setFilterScore(e.target.value ? Number(e.target.value) : null)}
                  className="p-2 border rounded w-20"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2">Date</th>
                    <th className="border border-gray-300 p-2">Idea</th>
                    <th className="border border-gray-300 p-2">Score</th>
                    <th className="border border-gray-300 p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredAnalyses.map((analysis) => (
                    <tr key={analysis.id}>
                      <td className="border border-gray-300 p-2">{new Date(analysis.date).toLocaleDateString()}</td>
                      <td className="border border-gray-300 p-2">{analysis.idea}</td>
                      <td className="border border-gray-300 p-2" style={{ color: getScoreColor(analysis.globalScore) }}>
                        {analysis.globalScore.toFixed(1)}%
                      </td>
                      <td className="border border-gray-300 p-2">
                        <button onClick={() => deleteAnalysis(analysis.id)} className="text-red-500">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <CSVLink
                data={csvData}
                filename={"startup_idea_analyses.csv"}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Export as CSV
              </CSVLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}