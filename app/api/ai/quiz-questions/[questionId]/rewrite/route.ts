import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { openai } from '@/lib/ai/openaiClient';
import type { Database } from '@/lib/database.types';

type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row'];

/**
 * POST /api/ai/quiz-questions/:questionId/rewrite
 * 
 * Rewrites a single quiz question that was marked as "bad".
 * See Section 7.2 of ai_Services_Plan.md
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || '';

    // Fetch the original question
    const { data: question, error: questionError } = await supabaseServer
      .from('quiz_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Quiz question not found' },
        { status: 404 }
      );
    }

    // Fetch concept and related context
    const { data: concept } = await supabaseServer
      .from('concepts')
      .select('id, name, generated_notes_mmd')
      .eq('id', question.concept_id)
      .single();

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    // Build prompt for rewriting the question
    const prompt = buildRewriteQuestionPrompt({
      conceptName: concept.name,
      conceptNotes: concept.generated_notes_mmd || '',
      originalQuestion: question as QuizQuestion,
      reason,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert educational content creator. Your task is to rewrite a quiz question to make it better, clearer, and more effective.

You must output ONLY valid JSON with no additional text, comments, or explanations. The JSON must match the exact schema specified.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error}`);
    }

    // Validate the response
    const rewrittenQuestion = validateRewrittenQuestion(parsed);

    // Update the question in the database
    const { error: updateError } = await supabaseServer
      .from('quiz_questions')
      .update({
        question_text: rewrittenQuestion.question_text,
        options: rewrittenQuestion.options,
        correct_option_index: rewrittenQuestion.correct_option_index,
        explanation: rewrittenQuestion.explanation || null,
      })
      .eq('id', questionId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update question' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      question_id: questionId,
      question: rewrittenQuestion,
    });
  } catch (error) {
    console.error('Error rewriting question:', error);
    return NextResponse.json(
      {
        error: 'Failed to rewrite question',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function buildRewriteQuestionPrompt(input: {
  conceptName: string;
  conceptNotes: string;
  originalQuestion: QuizQuestion;
  reason: string;
}): string {
  const { conceptName, conceptNotes, originalQuestion, reason } = input;

  const options = originalQuestion.options as string[];

  return `Rewrite the following quiz question to make it better, clearer, and more effective.

Concept: ${conceptName}

Concept Notes:
\`\`\`
${conceptNotes || '(No notes available)'}
\`\`\`

Original Question:
${originalQuestion.question_text}

Original Options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Correct Answer: Option ${originalQuestion.correct_option_index + 1} (${options[originalQuestion.correct_option_index]})

${originalQuestion.explanation ? `Original Explanation:\n${originalQuestion.explanation}\n` : ''}${reason ? `User Feedback:\n${reason}\n` : ''}

Generate a new, improved MCQ question for the same concept. The new question should:
- Be clearer and less ambiguous
- Have distinct, well-differentiated options
- Test understanding, not just recall
- Be appropriate for exam preparation

Output format (JSON):
{
  "question_text": "New question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_option_index": 1,
  "explanation": "Explanation of the correct answer..."
}

Important:
- Output ONLY the JSON object, no markdown code blocks, no explanations
- Ensure correct_option_index is 0-based (0, 1, 2, or 3)
- Make sure all options are distinct and plausible`;
}

function validateRewrittenQuestion(output: unknown): {
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
} {
  if (typeof output !== 'object' || output === null) {
    throw new Error('Rewritten question output must be an object');
  }

  const obj = output as Record<string, unknown>;

  if (typeof obj.question_text !== 'string') {
    throw new Error('Question text must be a string');
  }
  if (!Array.isArray(obj.options)) {
    throw new Error('Options must be an array');
  }
  if (obj.options.length < 2) {
    throw new Error('Question must have at least 2 options');
  }
  if (typeof obj.correct_option_index !== 'number') {
    throw new Error('Correct option index must be a number');
  }
  if (
    obj.correct_option_index < 0 ||
    obj.correct_option_index >= obj.options.length
  ) {
    throw new Error('Correct option index out of range');
  }

  return {
    question_text: obj.question_text,
    options: obj.options as string[],
    correct_option_index: obj.correct_option_index,
    explanation: typeof obj.explanation === 'string' ? obj.explanation : undefined,
  };
}

