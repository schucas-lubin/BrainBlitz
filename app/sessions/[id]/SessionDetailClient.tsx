'use client';

import { useState } from 'react';
import WordGame from '@/components/WordGame';

type Tab = 'learn' | 'quiz' | 'games';

interface SessionDetailClientProps {
  sessionId: string;
}

export default function SessionDetailClient({ sessionId }: SessionDetailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('learn');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'learn', label: 'Learn' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'games', label: 'Games' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'learn' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Learning Mode</h2>
            <p className="text-gray-600">
              TODO: Implement nested expandable tree for Topics → Subtopics → Concepts
              with generated notes, user notes, and special resources.
            </p>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Quiz Mode</h2>
            <p className="text-gray-600">
              TODO: Implement MCQ quiz interface with immediate feedback and mastery tracking.
            </p>
          </div>
        )}

        {activeTab === 'games' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Wordle-Style Vocab Game</h2>
            {/* TODO: Replace with real game entries from Supabase, filtered by concept */}
            <WordGame
              word="acidity"
              clue="The amount of hydronium ions in solution tells you the: ___"
              onComplete={(success, guesses) => {
                console.log(`Game completed: ${success ? 'success' : 'failure'} in ${guesses} guesses`);
                // TODO: Update concept mastery based on game result
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

