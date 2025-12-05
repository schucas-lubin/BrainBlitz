'use client';

import { useMemo } from 'react';
import type { QuizSummary as QuizSummaryType, ConceptResult } from '@/lib/quizTypes';
import { MASTERY_DISPLAY } from '@/lib/quizTypes';
import type { MasteryLevel } from '@/lib/constants';

interface QuizSummaryProps {
  summary: QuizSummaryType;
  onReturnToSetup: () => void;
  onBackToSession: () => void;
}

export default function QuizSummary({
  summary,
  onReturnToSetup,
  onBackToSession,
}: QuizSummaryProps) {
  const scoreColor = useMemo(() => {
    if (summary.scorePercent >= 80) return 'text-emerald-600';
    if (summary.scorePercent >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, [summary.scorePercent]);

  const scoreEmoji = useMemo(() => {
    if (summary.scorePercent >= 90) return '🏆';
    if (summary.scorePercent >= 80) return '🌟';
    if (summary.scorePercent >= 70) return '👏';
    if (summary.scorePercent >= 60) return '👍';
    if (summary.scorePercent >= 50) return '💪';
    return '📚';
  }, [summary.scorePercent]);

  const scoreMessage = useMemo(() => {
    if (summary.scorePercent >= 90) return 'Outstanding!';
    if (summary.scorePercent >= 80) return 'Great work!';
    if (summary.scorePercent >= 70) return 'Good job!';
    if (summary.scorePercent >= 60) return 'Not bad!';
    if (summary.scorePercent >= 50) return 'Getting there!';
    return 'Keep practicing!';
  }, [summary.scorePercent]);

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto">
      {/* Hero Score Section */}
      <div className="text-center mb-10">
        <div className="animate-popIn inline-block">
          <span className="text-6xl mb-4 block">{scoreEmoji}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 animate-fadeIn stagger-1">
          {scoreMessage}
        </h2>
        <div className="animate-fadeIn stagger-2">
          <span className={`text-6xl font-bold ${scoreColor}`}>
            {summary.scorePercent}%
          </span>
        </div>
        <p className="mt-3 text-gray-600 animate-fadeIn stagger-3">
          {summary.correctFirstTry} of {summary.totalQuestions} questions correct
          {summary.totalAttempts > summary.totalQuestions && (
            <span className="text-sm text-gray-500 block mt-1">
              ({summary.totalAttempts} total attempts with Active Recall)
            </span>
          )}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Questions"
          value={summary.totalQuestions}
          icon="📝"
          delay={1}
        />
        <StatCard
          label="Correct"
          value={summary.correctFirstTry}
          icon="✅"
          color="text-emerald-600"
          delay={2}
        />
        <StatCard
          label="Improved"
          value={summary.conceptsImproved.length}
          icon="📈"
          color="text-blue-600"
          delay={3}
        />
        <StatCard
          label="Still Weak"
          value={summary.conceptsStillWeak.length}
          icon="🎯"
          color="text-amber-600"
          delay={4}
        />
      </div>

      {/* Mastery Changes */}
      <div className="space-y-6 mb-8">
        {/* Improved Concepts */}
        {summary.conceptsImproved.length > 0 && (
          <div className="quiz-card p-6 animate-fadeIn stagger-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📈</span>
              Concepts Improved ({summary.conceptsImproved.length})
            </h3>
            <div className="space-y-2">
              {summary.conceptsImproved.map((concept, index) => (
                <ConceptResultRow
                  key={concept.conceptId}
                  concept={concept}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

        {/* Concepts Still Weak */}
        {summary.conceptsStillWeak.length > 0 && (
          <div className="quiz-card p-6 animate-fadeIn stagger-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">🎯</span>
              Focus Areas ({summary.conceptsStillWeak.length})
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              These concepts could use more practice
            </p>
            <div className="space-y-2">
              {summary.conceptsStillWeak
                .slice(0, 5)
                .map((concept, index) => (
                  <ConceptResultRow
                    key={concept.conceptId}
                    concept={concept}
                    index={index}
                    showProgress={false}
                  />
                ))}
              {summary.conceptsStillWeak.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  +{summary.conceptsStillWeak.length - 5} more concepts
                </p>
              )}
            </div>
          </div>
        )}

        {/* Decreased (if any) */}
        {summary.conceptsDecreased.length > 0 && (
          <div className="quiz-card p-6 border-red-100 animate-fadeIn stagger-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📉</span>
              Needs Review ({summary.conceptsDecreased.length})
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              These concepts dropped in mastery level
            </p>
            <div className="space-y-2">
              {summary.conceptsDecreased.map((concept, index) => (
                <ConceptResultRow
                  key={concept.conceptId}
                  concept={concept}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn stagger-5">
        <button
          onClick={onReturnToSetup}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold 
                     hover:bg-indigo-700 transition-all duration-200 
                     hover:shadow-lg active:scale-[0.98]"
        >
          🔄 Take Another Quiz
        </button>
        <button
          onClick={onBackToSession}
          className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold 
                     hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
        >
          ← Back to Session
        </button>
      </div>

      {/* Motivational Footer */}
      <div className="mt-10 text-center">
        <p className="text-sm text-gray-500">
          {summary.scorePercent >= 80
            ? "You're doing great! Keep up the excellent work! 🌟"
            : summary.scorePercent >= 60
            ? 'Good progress! Regular practice leads to mastery. 💪'
            : 'Every question is a learning opportunity. You got this! 🚀'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  delay?: number;
}

function StatCard({
  label,
  value,
  icon,
  color = 'text-gray-900',
  delay = 0,
}: StatCardProps) {
  return (
    <div
      className={`stat-card text-center animate-fadeIn stagger-${delay}`}
    >
      <span className="text-2xl mb-2 block">{icon}</span>
      <div className={`stat-value ${color}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

interface ConceptResultRowProps {
  concept: ConceptResult;
  index: number;
  showProgress?: boolean;
}

function ConceptResultRow({
  concept,
  index,
  showProgress = true,
}: ConceptResultRowProps) {
  const beforeMastery = MASTERY_DISPLAY[concept.masteryBefore];
  const afterMastery = MASTERY_DISPLAY[concept.masteryAfter];

  return (
    <div
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 truncate">
          {concept.conceptName}
        </div>
        <div className="text-xs text-gray-500">{concept.topicName}</div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {showProgress && concept.improved && (
          <>
            <span
              className={`mastery-badge ${beforeMastery.bgColor} ${beforeMastery.color} text-xs`}
            >
              {beforeMastery.emoji}
            </span>
            <span className="text-gray-400">→</span>
          </>
        )}
        <span
          className={`mastery-badge ${afterMastery.bgColor} ${afterMastery.color}`}
        >
          {afterMastery.emoji} {afterMastery.label}
        </span>
      </div>
    </div>
  );
}

