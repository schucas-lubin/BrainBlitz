'use client';

import { useState, useMemo } from 'react';
import type {
  QuizConfig,
  QuestionCount,
  QuizMode,
  TopicForSelection,
} from '@/lib/quizTypes';
import { QUIZ_MODE_INFO, MASTERY_DISPLAY } from '@/lib/quizTypes';
import type { MasteryLevel } from '@/lib/constants';

interface QuizSetupProps {
  topics: TopicForSelection[];
  totalQuestionCount: number;
  onStartQuiz: (config: QuizConfig) => void;
  isLoading?: boolean;
}

const QUESTION_COUNTS: QuestionCount[] = [10, 25, 50];

export default function QuizSetup({
  topics,
  totalQuestionCount,
  onStartQuiz,
  isLoading = false,
}: QuizSetupProps) {
  // Configuration state
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [mode, setMode] = useState<QuizMode>('normal');
  const [activeRecall, setActiveRecall] = useState(false);

  // Compute available questions based on selection
  const availableQuestions = useMemo(() => {
    if (selectedTopicIds.length === 0) {
      return totalQuestionCount;
    }
    return topics
      .filter((t) => selectedTopicIds.includes(t.id))
      .reduce((sum, t) => sum + t.questionCount, 0);
  }, [selectedTopicIds, topics, totalQuestionCount]);

  const effectiveQuestionCount = Math.min(questionCount, availableQuestions);
  const hasInsufficientQuestions = availableQuestions < questionCount;

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSelectAllTopics = () => {
    if (selectedTopicIds.length === topics.length) {
      setSelectedTopicIds([]);
    } else {
      setSelectedTopicIds(topics.map((t) => t.id));
    }
  };

  const handleStartQuiz = () => {
    onStartQuiz({
      selectedTopicIds,
      questionCount,
      mode,
      activeRecall,
    });
  };

  const canStartQuiz = availableQuestions > 0 && !isLoading;

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Start a Quiz
        </h2>
        <p className="text-gray-600">
          Configure your quiz settings and test your knowledge
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Topic Selection */}
        <div className="quiz-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">📚</span>
            Topics to Include
          </h3>

          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedTopicIds.length === 0
                ? 'All topics included'
                : `${selectedTopicIds.length} of ${topics.length} selected`}
            </span>
            <button
              onClick={handleSelectAllTopics}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {selectedTopicIds.length === topics.length
                ? 'Deselect all'
                : 'Select all'}
            </button>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
            {topics.map((topic, index) => {
              const isSelected =
                selectedTopicIds.length === 0 ||
                selectedTopicIds.includes(topic.id);
              const isExplicitlySelected = selectedTopicIds.includes(topic.id);

              return (
                <div
                  key={topic.id}
                  onClick={() => handleTopicToggle(topic.id)}
                  className={`topic-checkbox ${
                    isExplicitlySelected ? 'topic-selected' : ''
                  } animate-fadeIn`}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <input
                    type="checkbox"
                    checked={isExplicitlySelected}
                    onChange={() => {}}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {topic.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{topic.questionCount} questions</span>
                      <span>•</span>
                      <span>{topic.conceptCount} concepts</span>
                    </div>
                  </div>
                  <MasteryIndicator distribution={topic.masteryDistribution} />
                </div>
              );
            })}
          </div>

          {topics.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No topics available yet.</p>
              <p className="text-sm mt-1">Generate content to create quiz questions.</p>
            </div>
          )}
        </div>

        {/* Right Column: Quiz Options */}
        <div className="space-y-6">
          {/* Question Count */}
          <div className="quiz-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">#️⃣</span>
              Number of Questions
            </h3>

            <div className="flex gap-3">
              {QUESTION_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`count-pill flex-1 ${
                    questionCount === count ? 'count-pill-active' : ''
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            {hasInsufficientQuestions && (
              <p className="mt-3 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                Only {availableQuestions} question{availableQuestions !== 1 ? 's' : ''}{' '}
                available for this selection. Quiz will use all{' '}
                {effectiveQuestionCount}.
              </p>
            )}
          </div>

          {/* Quiz Mode */}
          <div className="quiz-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">🎮</span>
              Quiz Mode
            </h3>

            <div className="space-y-3">
              {(Object.keys(QUIZ_MODE_INFO) as QuizMode[]).map((modeKey) => {
                const info = QUIZ_MODE_INFO[modeKey];
                return (
                  <button
                    key={modeKey}
                    onClick={() => setMode(modeKey)}
                    className={`mode-pill w-full text-left ${
                      mode === modeKey ? 'mode-pill-active' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <div className="font-medium">{info.label}</div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          {info.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Recall Toggle */}
          <div className="quiz-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔄</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Active Recall</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Incorrect questions reappear later in the quiz
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveRecall(!activeRecall)}
                className={`toggle-switch ${
                  activeRecall ? 'toggle-switch-enabled' : 'toggle-switch-disabled'
                }`}
                role="switch"
                aria-checked={activeRecall}
              >
                <span
                  className={`toggle-switch-knob ${
                    activeRecall ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-gray-600">
          <span className="font-medium text-gray-900">
            {effectiveQuestionCount}
          </span>{' '}
          question{effectiveQuestionCount !== 1 ? 's' : ''} will be selected
          {mode !== 'normal' && (
            <span className="text-indigo-600 ml-1">
              ({QUIZ_MODE_INFO[mode].label} mode)
            </span>
          )}
        </div>

        <button
          onClick={handleStartQuiz}
          disabled={!canStartQuiz}
          className={`
            px-8 py-3 rounded-xl font-semibold text-lg
            transition-all duration-200 ease-out
            ${
              canStartQuiz
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg active:scale-[0.98]'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Preparing Quiz...
            </span>
          ) : (
            'Start Quiz →'
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function MasteryIndicator({
  distribution,
}: {
  distribution: Record<MasteryLevel, number>;
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const levels: MasteryLevel[] = ['Cooked', 'Meh', "There's Hope", 'Locked in'];
  const colors: Record<MasteryLevel, string> = {
    'Cooked': 'bg-red-400',
    'Meh': 'bg-orange-400',
    "There's Hope": 'bg-yellow-400',
    'Locked in': 'bg-emerald-400',
  };

  return (
    <div className="flex gap-0.5 h-2 w-16 rounded-full overflow-hidden bg-gray-200">
      {levels.map((level) => {
        const count = distribution[level];
        const percent = (count / total) * 100;
        if (percent === 0) return null;
        return (
          <div
            key={level}
            className={`${colors[level]}`}
            style={{ width: `${percent}%` }}
          />
        );
      })}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

