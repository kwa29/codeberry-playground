'use client';

import { useState, useCallback, ChangeEvent } from 'react';
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
}

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
      setPitchDeck(e.target.files[0]);
      setFileName(e.target.files[0].name);
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
              <label htmlFor="pitchDeck" className="block text-sm font-medium text-gray-700">Upload Pitch Deck (optional)</label>
              <input
                type="file"
                id="pitchDeck"
                onChange={handleFileChange}
                accept=".pdf,.ppt,.pptx"
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
                <ul className="list-disc pl-5">
                  {validatedIdea.swot.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-yellow-100 p-4 rounded-md">
                <h4 className="font-bold text-yellow-700 mb-2">Weaknesses</h4>
                <ul className="list-disc pl-5">
                  {validatedIdea.swot.weaknesses.map((weakness, index) => (
                    <li key={index}>{weakness}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-green-100 p-4 rounded-md">
                <h4 className="font-bold text-green-700 mb-2">Opportunities</h4>
                <ul className="list-disc pl-5">
                  {validatedIdea.swot.opportunities.map((opportunity, index) => (
                    <li key={index}>{opportunity}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-100 p-4 rounded-md">
                <h4 className="font-bold text-red-700 mb-2">Threats</h4>
                <ul className="list-disc pl-5">
                  {validatedIdea.swot.threats.map((threat, index) => (
                    <li key={index}>{threat}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">Critical Questions</h3>
            <ul className="list-disc pl-5">
              {validatedIdea.criticalQuestions.map((question, index) => (
                <li key={index} className="mb-2">{question}</li>
              ))}
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">📊 5 Ways to Reach Your Target Market</h3>
            <p className="text-gray-600 mb-4">Strategies to connect with and engage your target audience, crucial for your startup's market penetration.</p>
            <ol className="list-decimal pl-5">
              {validatedIdea.targetMarketStrategies.map((strategy, index) => (
                <li key={index} className="mb-2">{strategy}</li>
              ))}
            </ol>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">🏆 Competition or Similar Players to Keep in Mind</h3>
            <p className="text-gray-600 mb-4">Understand your competitive landscape. Knowing your rivals helps in positioning your startup strategically in the market.</p>
            <ul className="list-disc pl-5">
              {validatedIdea.competition.map((competitor, index) => (
                <li key={index} className="mb-2">{competitor}</li>
              ))}
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">🚀 Your Action Plan</h3>
            <p className="text-gray-600 mb-4">Actionable steps to move your startup idea from concept to reality and bring you closer to 100K MRR🤑.</p>
            <ol className="list-decimal pl-5">
              {validatedIdea.actionPlan.map((step, index) => (
                <li key={index} className="mb-2">{step}</li>
              ))}
            </ol>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">📈 Market Demand Indicators</h3>
            <p className="text-gray-600 mb-4">Key signals that suggest a strong market need for your startup. These indicators can guide your strategy to align with market demand.</p>
            <ul className="list-disc pl-5">
              {validatedIdea.marketDemandIndicators.map((indicator, index) => (
                <li key={index} className="mb-2">{indicator}</li>
              ))}
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4">📚 Frameworks to Evaluate</h3>
            <p className="text-gray-600 mb-4">Strategic frameworks to critically assess and enhance your startup's approach and business model.</p>
            <ul className="list-disc pl-5">
              {validatedIdea.frameworks.map((framework, index) => (
                <li key={index} className="mb-2">{framework}</li>
              ))}
            </ul>
          </div>

          <div className="text-center">
            <a
              href="#"
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