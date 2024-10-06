'use client';

import { useState, useEffect } from 'react';
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

  // Log startupIdeas to verify import
  console.log('Imported startupIdeas:', startupIdeas);

  const handleSearch = () => {
    console.log('Searching for:', query);
    const searchResults = startupIdeas.filter(idea =>
      idea.keywords.some(keyword =>
        keyword.toLowerCase().includes(query.toLowerCase())
      )
    );
    console.log('Search results:', searchResults);
    setResults(searchResults);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearch();
  };

  // Implement search as user types
  useEffect(() => {
    handleSearch();
  }, [query]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Startup Idea Finder</h1>
      
      <form onSubmit={handleSubmit} className="w-full max-w-md mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter keywords for your startup idea"
          className="w-full p-2 border border-gray-300 rounded"
        />
        <button
          type="submit"
          className="mt-4 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Find Ideas
        </button>
      </form>

      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Results:</h2>
        {results.length > 0 ? (
          <ul className="list-disc pl-5">
            {results.map((result) => (
              <li key={result.id} className="mb-2">
                <strong>{result.title}:</strong> {result.description}
              </li>
            ))}
          </ul>
        ) : (
          <p>No results yet. Try searching for some ideas!</p>
        )}
      </div>
    </div>
  );
}
