'use client';

import { useState, useEffect, useCallback } from 'react';
import { startupIdeas } from './data/startupIdeas';

interface StartupIdea {
  id: number;
  title: string;
  description: string;
  keywords: string[];
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StartupIdea[]>([]);
  const [aiIdea, setAiIdea] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const handleSearch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setAiIdea(null);
    try {
      console.log('Searching for:', query);
      const searchResults = startupIdeas.filter(idea =>
        idea.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase())) ||
        idea.title.toLowerCase().includes(query.toLowerCase()) ||
        idea.description.toLowerCase().includes(query.toLowerCase())
      );
      console.log('Search results:', searchResults);
      setResults(searchResults);
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const generateAIIdea = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (response.status !== 200) {
        throw data.error || new Error(`Request failed with status ${response.status}`);
      }
      setAiIdea(data.result);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while generating an AI idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(debounce(handleSearch, 300), [handleSearch]);

  useEffect(() => {
    if (query) {
      debouncedSearch();
    } else {
      setResults([]);
    }
  }, [query, debouncedSearch]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generateAIIdea();
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
  };

  const getRelatedKeywords = (idea: StartupIdea) => {
    return idea.keywords.filter(keyword => !keyword.toLowerCase().includes(query.toLowerCase()));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Startup Idea Finder</h1>
      
      <form onSubmit={handleSubmit} className="w-full max-w-md mb-8">
        <div className="flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter keywords for your startup idea"
            className="flex-grow p-2 border border-gray-300 rounded-l"
          />
          {query && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-2 bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="submit"
          className="mt-4 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Generate AI Idea
        </button>
      </form>

      {isLoading && <p>Processing your request...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {aiIdea && (
        <div className="w-full max-w-md mb-8">
          <h2 className="text-xl font-semibold mb-4">AI Generated Idea:</h2>
          <p className="bg-green-100 border border-green-300 rounded p-4">{aiIdea}</p>
        </div>
      )}

      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Database Results:</h2>
        {results.length > 0 ? (
          <ul className="list-disc pl-5">
            {results.map((result) => (
              <li key={result.id} className="mb-4">
                <strong>{result.title}</strong>
                <p>{result.description}</p>
                <p className="text-sm text-gray-600">
                  Related: {getRelatedKeywords(result).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No results from the database. Try searching for some ideas!</p>
        )}
      </div>
    </div>
  );
}
