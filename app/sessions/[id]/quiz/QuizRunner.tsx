'use client';

import { useState, useCallback, useEffect } from 'react';
import type { QueuedQuestion, AnswerRecord } from '@/lib/quizTypes';
import { MASTERY_DISPLAY } from '@/lib/quizTypes';

interface QuizRunnerProps {
  questions: QueuedQuestion[];
  currentIndex: number;
  totalQuestions: number;
  activeRecall: boolean;
  onAnswer: (
    questionId: string,
    conceptId: string,
    selectedIndex: number,
    isCorrect: boolean
  ) => void;
  onNext: () => void;
  onRequeueForRecall: () => void;
  onStopQuiz: () => void;
  onBadQuestion: (questionId: string) => void;
}

export default function QuizRunner({
  questions,
  currentIndex,
  totalQuestions,
  activeRecall,
  onAnswer,
  onNext,
  onRequeueForRecall,
  onStopQuiz,
  onBadQuestion,
}: QuizRunnerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;

  // Reset state when moving to next question
  useEffect(() => {
    setSelectedIndex(null);
    setHasAnswered(false);
    setAnimationKey((k) => k + 1);
  }, [currentIndex]);

  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (hasAnswered) return;

      setSelectedIndex(optionIndex);
      setHasAnswered(true);

      const isCorrect = optionIndex === currentQuestion.correct_option_index;
      onAnswer(
        currentQuestion.id,
        currentQuestion.concept_id,
        optionIndex,
        isCorrect
      );

      // Handle Active Recall
      if (activeRecall && !isCorrect) {
        onRequeueForRecall();
      }
    },
    [hasAnswered, currentQuestion, onAnswer, activeRecall, onRequeueForRecall]
  );

  const handleNext = () => {
    if (isLastQuestion) {
      onStopQuiz();
    } else {
      onNext();
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!hasAnswered) {
        // Number keys 1-4 for options
        const key = parseInt(e.key);
        if (key >= 1 && key <= currentQuestion.options.length) {
          handleSelectOption(key - 1);
        }
      } else {
        // Enter or Space for next
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNext();
        }
      }
    },
    [hasAnswered, currentQuestion, handleSelectOption]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isCorrect = selectedIndex === currentQuestion.correct_option_index;
  const mastery = MASTERY_DISPLAY[currentQuestion.masteryLevel];

  return (
    <div className="animate-fadeIn">
      {/* Header with Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
            {currentQuestion.appearanceCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                🔄 Retry #{currentQuestion.appearanceCount + 1}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowStopConfirm(true)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Stop Quiz
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 progress-bar rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div
        key={animationKey}
        className="quiz-card p-8 mb-6 animate-slideInRight"
      >
        {/* Topic & Mastery Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{currentQuestion.topicName}</span>
            {currentQuestion.subtopicName && (
              <>
                <span className="text-gray-300">›</span>
                <span className="text-gray-500">
                  {currentQuestion.subtopicName}
                </span>
              </>
            )}
          </div>
          <div
            className={`mastery-badge ${mastery.bgColor} ${mastery.color}`}
            title={`Current mastery: ${mastery.label}`}
          >
            <span>{mastery.emoji}</span>
            <span>{mastery.label}</span>
          </div>
        </div>

        {/* Concept Name */}
        <div className="mb-4">
          <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
            Concept
          </span>
          <h3 className="text-lg font-semibold text-gray-900">
            {currentQuestion.conceptName}
          </h3>
        </div>

        {/* Question Text */}
        <p className="text-xl text-gray-800 leading-relaxed mb-8">
          {currentQuestion.question_text}
        </p>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            let optionClass = 'quiz-option border-gray-200 bg-white';
            let icon = null;

            if (hasAnswered) {
              if (index === currentQuestion.correct_option_index) {
                optionClass = 'quiz-option selected-correct';
                icon = '✓';
              } else if (index === selectedIndex) {
                optionClass = 'quiz-option selected-incorrect animate-shake';
                icon = '✗';
              } else {
                optionClass = 'quiz-option border-gray-100 bg-gray-50 opacity-60';
              }
            } else if (index === selectedIndex) {
              optionClass = 'quiz-option border-indigo-500 bg-indigo-50';
            }

            return (
              <button
                key={index}
                onClick={() => handleSelectOption(index)}
                disabled={hasAnswered}
                className={optionClass}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm
                    ${
                      hasAnswered && index === currentQuestion.correct_option_index
                        ? 'bg-emerald-500 text-white'
                        : hasAnswered && index === selectedIndex
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {icon || String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 text-left">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {hasAnswered && currentQuestion.explanation && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl animate-fadeIn">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-lg">💡</span>
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Explanation
                </p>
                <p className="text-sm text-blue-800">
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bad Question Button */}
        {hasAnswered && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onBadQuestion(currentQuestion.id)}
              className="text-xs px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              🚩 Bad Question
            </button>
          </div>
        )}
      </div>

      {/* Feedback & Next Button */}
      {hasAnswered && (
        <div className="flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <span className="text-2xl animate-bounce-subtle">🎉</span>
                <span className="font-semibold">Correct!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <span className="text-2xl">😅</span>
                <span className="font-semibold">Not quite!</span>
                {activeRecall && (
                  <span className="text-sm text-gray-500 ml-2">
                    (This question will appear again)
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleNext}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold 
                       hover:bg-indigo-700 transition-all duration-200 
                       hover:shadow-lg active:scale-[0.98]"
          >
            {isLastQuestion ? 'See Results →' : 'Next Question →'}
          </button>
        </div>
      )}

      {/* Keyboard Hint */}
      {!hasAnswered && (
        <div className="mt-4 text-center text-sm text-gray-400">
          Press 1-{currentQuestion.options.length} to select an answer
        </div>
      )}

      {/* Stop Quiz Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-fadeInScale">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Stop Quiz?
            </h3>
            <p className="text-gray-600 mb-6">
              You've answered {currentIndex} of {questions.length} questions.
              Your progress will be saved and you'll see your results.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Continue Quiz
              </button>
              <button
                onClick={onStopQuiz}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop & See Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

