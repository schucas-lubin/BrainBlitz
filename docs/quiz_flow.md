# Quiz Flow Documentation

This document describes the Quiz experience in BrainBlitz, including setup options, quiz modes, and how mastery is updated.

## Overview

The Quiz tab provides a polished, interactive quiz experience with three main modes:

1. **Setup Mode** - Configure quiz options before starting
2. **Running Mode** - Answer questions one at a time
3. **Summary Mode** - View results and mastery changes

## Quiz Setup Options

### Content Scope Selection

Choose which topics to include in your quiz:

- **All Topics** (default) - Questions from all topics in the session
- **Specific Topics** - Select individual topics with checkboxes

Each topic shows:
- Number of questions available
- Number of concepts
- Mastery distribution indicator (color-coded bar)

### Number of Questions

Select the desired quiz length:

- **10 questions** - Quick review
- **25 questions** - Standard session
- **50 questions** - Deep practice

If fewer questions are available than requested, the quiz automatically uses all available questions and displays a notification.

### Quiz Modes

#### Normal Mode 🎲
- Uniform random selection from eligible questions
- Good for general review and mixed practice
- Default mode for most quizzes

#### Target Weaknesses Mode 🎯
- Prioritizes concepts with lower mastery levels
- Uses weighted selection based on mastery weights:
  - Cooked: weight 3 (highest priority)
  - Meh: weight 2
  - There's Hope: weight 1
  - Locked in: weight 0 (excluded)
- Best for focused improvement on weak areas

#### Suggested Topics Mode 📚
- Works at the topic level rather than concept level
- Computes average mastery per topic
- Prioritizes topics with lowest average mastery
- Useful for identifying and practicing entire weak topic areas

### Active Recall Toggle 🔄

When enabled:
- Incorrect answers cause the question to reappear later in the quiz
- Questions can appear up to 3 times maximum
- Each appearance is tracked and counted in summary
- Helps reinforce learning through spaced repetition

## Quiz Runner

### Question Display

Each question shows:
- **Topic/Subtopic breadcrumb** - Context for the question
- **Concept name** - The specific concept being tested
- **Mastery badge** - Current mastery level with emoji and color
- **Question text** - The actual question
- **Answer options** - A-D clickable buttons

### Answer Flow

1. Select an answer option (or use keyboard 1-4)
2. Immediate feedback:
   - ✓ Green for correct
   - ✗ Red for incorrect (with shake animation)
   - Correct answer revealed if wrong
3. Explanation shown (if available)
4. "Bad Question" button available to flag and rewrite
5. Click "Next Question" to continue

### Progress Tracking

- Animated progress bar at the top
- Question counter (e.g., "Question 5 of 25")
- Retry indicator for Active Recall questions

### Keyboard Controls

- **1-4**: Select answer option
- **Enter/Space**: Move to next question (after answering)

### Stop Quiz

- Click "Stop Quiz" at any time
- Confirmation modal prevents accidental stops
- Partial results are saved and shown in summary

## Mastery System

### Mastery Levels

From lowest to highest:
1. 🔥 **Cooked** - Needs significant work
2. 😐 **Meh** - Getting there
3. 🌟 **There's Hope** - Making progress
4. 🔒 **Locked In** - Mastered

### Level Transitions

**Improving (correct answers):**
- Cooked → Meh: 3 correct in a row
- Meh → There's Hope: 2 correct in a row
- There's Hope → Locked In: 2 correct in a row

**Declining (incorrect answers):**
- Locked In → There's Hope: 2 incorrect in a row
- There's Hope → Meh: 2 incorrect in a row
- Meh → Cooked: 2 incorrect in a row

### Mastery Updates

- Mastery is updated immediately after each answer
- Changes are persisted to Supabase in real-time
- Streak counts (correct/incorrect) are maintained
- Each Active Recall appearance counts as a new attempt

## Quiz Summary

### Score Display

- Large percentage score
- Emoji based on performance:
  - 🏆 90%+ Outstanding
  - 🌟 80%+ Great
  - 👏 70%+ Good
  - 👍 60%+ Not bad
  - 💪 50%+ Getting there
  - 📚 <50% Keep practicing

### Statistics Cards

- Total questions answered
- Correct answers (first try)
- Concepts improved
- Concepts still weak

### Mastery Changes

**Concepts Improved 📈**
- Shows before/after mastery levels
- Lists all concepts that moved up

**Focus Areas 🎯**
- Concepts still at Cooked or Meh level
- Priority for future practice

**Needs Review 📉**
- Concepts that dropped in mastery
- Important areas to revisit

### Actions

- **Take Another Quiz** - Return to setup with fresh configuration
- **Back to Session** - Return to session overview

## Technical Implementation

### State Machine

The QuizTab component manages three states:
- `setup`: Initial configuration
- `running`: Active quiz session
- `summary`: Results display

### Key Files

- `lib/quizTypes.ts` - Type definitions and constants
- `lib/quizEngine.ts` - Question selection and utility functions
- `app/sessions/[id]/quiz/QuizSetup.tsx` - Configuration UI
- `app/sessions/[id]/quiz/QuizRunner.tsx` - Question display and interaction
- `app/sessions/[id]/quiz/QuizSummary.tsx` - Results display
- `app/sessions/[id]/quiz/QuizTab.tsx` - State machine orchestration

### Data Flow

1. QuizTab fetches topics, concepts, and questions on mount
2. User configures quiz in QuizSetup
3. selectQuestions() builds question queue based on config
4. QuizRunner displays questions and updates mastery
5. QuizSummary computes and displays results

### Mastery Integration

Uses existing utilities:
- `lib/mastery.ts` - `updateMastery()` function
- `lib/targetWeaknesses.ts` - Weighted selection helpers
- `lib/constants.ts` - Mastery levels and weights

## UI/UX Features

### Animations

- Fade-in for card appearances
- Slide-in for question transitions
- Pop animation for score reveal
- Shake animation for incorrect answers
- Bounce for correct celebration
- Smooth progress bar transitions

### Accessibility

- Keyboard navigation support
- Focus states on all interactive elements
- Color + icon indicators (not color alone)
- Clear contrast and readable text

### Responsive Design

- Desktop-first layout
- Single column on mobile
- Touch-friendly button sizes
- Scrollable topic selection

