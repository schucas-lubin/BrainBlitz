'use client';

import { useState, useEffect, useCallback } from 'react';

type LetterState = 'correct' | 'present' | 'absent' | 'empty';

interface Letter {
  char: string;
  state: LetterState;
}

interface WordGameProps {
  word: string;
  clue: string;
  onComplete?: (success: boolean, guesses: number) => void;
}

export default function WordGame({ word, clue, onComplete }: WordGameProps) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const wordUpper = word.toUpperCase();
  const maxGuesses = 6;
  const wordLength = word.length;

  // Validate word length
  if (wordLength < 4) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          Error: Word must be at least 4 characters long
        </p>
      </div>
    );
  }

  const getLetterStates = (guess: string): Letter[] => {
    const states: Letter[] = [];
    const wordLetters = wordUpper.split('');
    const guessLetters = guess.toUpperCase().split('');
    const usedIndices = new Set<number>();

    // First pass: mark correct positions
    guessLetters.forEach((char, i) => {
      if (char === wordLetters[i]) {
        states.push({ char, state: 'correct' });
        usedIndices.add(i);
      } else {
        states.push({ char, state: 'empty' });
      }
    });

    // Second pass: mark present (wrong position) and absent
    guessLetters.forEach((char, i) => {
      if (states[i].state === 'correct') {
        return; // Already marked as correct
      }

      // Check if this letter exists in the word at a different position
      let found = false;
      for (let j = 0; j < wordLetters.length; j++) {
        if (!usedIndices.has(j) && wordLetters[j] === char) {
          found = true;
          usedIndices.add(j);
          break;
        }
      }

      if (found) {
        states[i] = { char, state: 'present' };
      } else {
        states[i] = { char, state: 'absent' };
      }
    });

    return states;
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isComplete) return;

      if (key === 'Enter') {
        if (currentGuess.length === wordLength) {
          const newGuesses = [...guesses, currentGuess.toUpperCase()];
          setGuesses(newGuesses);
          setCurrentGuess('');

          if (currentGuess.toUpperCase() === wordUpper) {
            setIsComplete(true);
            setIsSuccess(true);
            onComplete?.(true, newGuesses.length);
          } else if (newGuesses.length >= maxGuesses) {
            setIsComplete(true);
            setIsSuccess(false);
            onComplete?.(false, newGuesses.length);
          }
        }
      } else if (key === 'Backspace') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[A-Za-z]$/.test(key) && currentGuess.length < wordLength) {
        setCurrentGuess((prev) => prev + key.toUpperCase());
      }
    },
    [currentGuess, guesses, isComplete, wordLength, wordUpper, onComplete]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Backspace' || /^[A-Za-z]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  const getStateColor = (state: LetterState): string => {
    switch (state) {
      case 'correct':
        return 'bg-green-500 text-white';
      case 'present':
        return 'bg-yellow-500 text-white';
      case 'absent':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-100 text-gray-800 border-2 border-gray-300';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Clue Display */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-900 mb-1">Clue:</p>
        <p className="text-blue-800">{clue}</p>
      </div>

      {/* Game Board */}
      <div className="space-y-2 mb-6">
        {/* Previous guesses */}
        {guesses.map((guess, guessIndex) => {
          const letterStates = getLetterStates(guess);
          return (
            <div key={guessIndex} className="flex gap-2 justify-center">
              {letterStates.map((letter, letterIndex) => (
                <div
                  key={letterIndex}
                  className={`w-12 h-12 flex items-center justify-center font-bold text-lg rounded ${getStateColor(
                    letter.state
                  )}`}
                >
                  {letter.char}
                </div>
              ))}
            </div>
          );
        })}

        {/* Current guess */}
        {!isComplete && (
          <div className="flex gap-2 justify-center">
            {Array.from({ length: wordLength }).map((_, i) => (
              <div
                key={i}
                className={`w-12 h-12 flex items-center justify-center font-bold text-lg rounded border-2 ${
                  i < currentGuess.length
                    ? 'bg-white border-gray-400'
                    : 'bg-gray-100 border-gray-300'
                }`}
              >
                {currentGuess[i] || ''}
              </div>
            ))}
          </div>
        )}

        {/* Empty rows for remaining guesses */}
        {Array.from({ length: maxGuesses - guesses.length - (isComplete ? 0 : 1) }).map(
          (_, rowIndex) => (
            <div key={`empty-${rowIndex}`} className="flex gap-2 justify-center">
              {Array.from({ length: wordLength }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 bg-gray-100 border-2 border-gray-300 rounded"
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Status Message */}
      {isComplete && (
        <div
          className={`p-4 rounded-lg text-center mb-4 ${
            isSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}
        >
          {isSuccess ? (
            <p className="text-green-800 font-semibold">
              🎉 Success! You guessed it in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!
            </p>
          ) : (
            <div>
              <p className="text-red-800 font-semibold mb-2">Game Over</p>
              <p className="text-red-700 text-sm">The word was: {word.toUpperCase()}</p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!isComplete && (
        <div className="text-xs text-gray-600 text-center space-y-1">
          <p>Type your guess and press Enter</p>
          <p>
            {guesses.length + 1} / {maxGuesses} guesses
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">Legend:</p>
        <div className="flex gap-2 justify-center text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Correct</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span>Absent</span>
          </div>
        </div>
      </div>
    </div>
  );
}

