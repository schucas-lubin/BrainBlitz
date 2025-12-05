'use client';

import { useState } from 'react';

interface QuizQuestionCardProps {
  question: {
    id: string;
    question_text: string;
    options: string[];
    correct_option_index: number;
    explanation: string | null;
  };
  index: number;
}

export default function QuizQuestionCard({ question, index }: QuizQuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = (optionIndex: number) => {
    if (selectedIndex !== null) return; // Already answered
    setSelectedIndex(optionIndex);
    setShowExplanation(true);
  };

  const isCorrect = selectedIndex === question.correct_option_index;
  const isWrong = selectedIndex !== null && selectedIndex !== question.correct_option_index;

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-lg">Question {index + 1}</h3>
        {selectedIndex !== null && (
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${
              isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </span>
        )}
      </div>

      <p className="text-gray-800 mb-4">{question.question_text}</p>

      <div className="space-y-2 mb-4">
        {question.options.map((option, optionIndex) => {
          let buttonClass = 'w-full text-left p-3 border rounded hover:bg-gray-50 transition-colors';
          
          if (selectedIndex === optionIndex) {
            if (isCorrect) {
              buttonClass += ' bg-green-50 border-green-300';
            } else {
              buttonClass += ' bg-red-50 border-red-300';
            }
          } else if (selectedIndex !== null && optionIndex === question.correct_option_index) {
            buttonClass += ' bg-green-50 border-green-300';
          } else {
            buttonClass += ' border-gray-300';
          }

          return (
            <button
              key={optionIndex}
              onClick={() => handleSelect(optionIndex)}
              disabled={selectedIndex !== null}
              className={buttonClass}
            >
              <span className="font-medium mr-2">{String.fromCharCode(65 + optionIndex)}.</span>
              {option}
            </button>
          );
        })}
      </div>

      {showExplanation && question.explanation && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
          <p className="text-sm text-blue-800">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

