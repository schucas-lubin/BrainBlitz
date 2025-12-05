import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateContent } from '@/lib/ai/generateContent';
import type { Database } from '@/lib/database.types';

type Concept = Database['public']['Tables']['concepts']['Row'];
type QuizQuestionInsert = Database['public']['Tables']['quiz_questions']['Insert'];
type WordGameEntryInsert = Database['public']['Tables']['word_game_entries']['Insert'];

/**
 * POST /api/ai/sessions/:sessionId/content
 * 
 * Job 2: SESSION_CONTENT_GENERATION
 * 
 * Generates notes, quiz questions, and word game entries for concepts
 * in the specified scope (session/subtopic/concept).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const scope = body.scope || 'session';
    const subtopicId = body.subtopic_id;
    const conceptId = body.concept_id;
    const overwriteMode = body.overwrite_mode || 'replace';

    // Validate scope parameters
    if (scope === 'subtopic' && !subtopicId) {
      return NextResponse.json(
        { error: 'subtopic_id required when scope is "subtopic"' },
        { status: 400 }
      );
    }
    if (scope === 'concept' && !conceptId) {
      return NextResponse.json(
        { error: 'concept_id required when scope is "concept"' },
        { status: 400 }
      );
    }

    // Fetch session data
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, title, subject, raw_mmd')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Fetch concepts based on scope
    let conceptsQuery = supabaseServer
      .from('concepts')
      .select('id, name, session_id, topic_id, subtopic_id, needs_research')
      .eq('session_id', sessionId);

    if (scope === 'subtopic' && subtopicId) {
      conceptsQuery = conceptsQuery.eq('subtopic_id', subtopicId);
    } else if (scope === 'concept' && conceptId) {
      conceptsQuery = conceptsQuery.eq('id', conceptId);
    }
    // scope === 'session' means all concepts, no additional filter

    const { data: concepts, error: conceptsError } = await conceptsQuery;

    if (conceptsError) {
      return NextResponse.json(
        { error: 'Failed to fetch concepts' },
        { status: 500 }
      );
    }

    if (!concepts || concepts.length === 0) {
      return NextResponse.json(
        { error: 'No concepts found for the specified scope' },
        { status: 400 }
      );
    }

    // Generate content using AI
    const contentOutput = await generateContent({
      sessionId,
      concepts: concepts as Concept[],
      rawMmd: session.raw_mmd,
      subject: session.subject,
      title: session.title,
    });

    // Write to database based on overwrite mode
    if (overwriteMode === 'replace') {
      // For each concept, delete existing quiz questions and word game entries
      // and update generated_notes_mmd

      for (const conceptContent of contentOutput.concepts) {
        const concept = concepts.find((c) => c.id === conceptContent.concept_id);
        if (!concept) continue;

        // Delete existing quiz questions
        const { error: deleteQuizError } = await supabaseServer
          .from('quiz_questions')
          .delete()
          .eq('concept_id', conceptContent.concept_id);

        if (deleteQuizError) {
          console.error('Error deleting quiz questions:', deleteQuizError);
          // Continue anyway
        }

        // Delete existing word game entries
        const { error: deleteWordError } = await supabaseServer
          .from('word_game_entries')
          .delete()
          .eq('concept_id', conceptContent.concept_id);

        if (deleteWordError) {
          console.error('Error deleting word game entries:', deleteWordError);
          // Continue anyway
        }

        // Update generated_notes_mmd
        const { error: updateNotesError } = await supabaseServer
          .from('concepts')
          .update({ generated_notes_mmd: conceptContent.notes_markdown })
          .eq('id', conceptContent.concept_id);

        if (updateNotesError) {
          console.error('Error updating notes:', updateNotesError);
          return NextResponse.json(
            { error: `Failed to update notes for concept ${conceptContent.concept_id}` },
            { status: 500 }
          );
        }

        // Insert new quiz questions
        if (conceptContent.quiz_questions.length > 0) {
          const quizInserts: QuizQuestionInsert[] = conceptContent.quiz_questions.map(
            (q) => ({
              session_id: concept.session_id,
              topic_id: concept.topic_id,
              subtopic_id: concept.subtopic_id, // Can be null for orphan concepts
              concept_id: conceptContent.concept_id,
              question_text: q.question_text,
              options: q.options,
              correct_option_index: q.correct_option_index,
              explanation: q.explanation || null,
            })
          );

          const { error: insertQuizError } = await supabaseServer
            .from('quiz_questions')
            .insert(quizInserts);

          if (insertQuizError) {
            console.error('Error inserting quiz questions:', insertQuizError);
            return NextResponse.json(
              { error: 'Failed to insert quiz questions' },
              { status: 500 }
            );
          }
        }

        // Insert new word game entries
        if (conceptContent.word_game_entries.length > 0) {
          const wordGameInserts: WordGameEntryInsert[] = conceptContent.word_game_entries.map(
            (e) => ({
              session_id: concept.session_id,
              topic_id: concept.topic_id,
              subtopic_id: concept.subtopic_id, // Can be null for orphan concepts
              concept_id: conceptContent.concept_id,
              word: e.word,
              clue: e.clue,
              order_index: e.order_index,
            })
          );

          const { error: insertWordError } = await supabaseServer
            .from('word_game_entries')
            .insert(wordGameInserts);

          if (insertWordError) {
            console.error('Error inserting word game entries:', insertWordError);
            return NextResponse.json(
              { error: 'Failed to insert word game entries' },
              { status: 500 }
            );
          }
        }
      }
    }

    // Calculate summary statistics
    const totalQuestions = contentOutput.concepts.reduce(
      (sum, c) => sum + c.quiz_questions.length,
      0
    );
    const totalWordEntries = contentOutput.concepts.reduce(
      (sum, c) => sum + c.word_game_entries.length,
      0
    );

    return NextResponse.json({
      success: true,
      scope,
      stats: {
        concepts_updated: contentOutput.concepts.length,
        quiz_questions_generated: totalQuestions,
        word_game_entries_generated: totalWordEntries,
      },
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

