import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { openai } from '@/lib/ai/openaiClient';

/**
 * POST /api/ai/concepts/:conceptId/rewrite-notes
 * 
 * Rewrites notes for a concept with optional modifiers.
 * See Section 7.1 of ai_Services_Plan.md
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conceptId: string }> }
) {
  try {
    const { conceptId } = await params;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const modifiers = body.modifiers || {};

    // Fetch concept and related data
    const { data: concept, error: conceptError } = await supabaseServer
      .from('concepts')
      .select(
        'id, name, generated_notes_mmd, needs_research, session_id, topic_id, subtopic_id'
      )
      .eq('id', conceptId)
      .single();

    if (conceptError || !concept) {
      return NextResponse.json(
        { error: 'Concept not found' },
        { status: 404 }
      );
    }

    // Fetch session for context
    const { data: session } = await supabaseServer
      .from('sessions')
      .select('title, subject, raw_mmd')
      .eq('id', concept.session_id)
      .single();

    // Build prompt for rewriting notes
    const prompt = buildRewriteNotesPrompt({
      conceptName: concept.name,
      existingNotes: concept.generated_notes_mmd || '',
      needsResearch: concept.needs_research,
      modifiers,
      sessionContext: session,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert educational content writer. Your task is to rewrite and improve study notes based on user-specified modifiers.

You must output ONLY the rewritten notes in markdown format, with no additional text, explanations, or JSON wrapping.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const rewrittenNotes = completion.choices[0]?.message?.content;
    if (!rewrittenNotes) {
      throw new Error('No content returned from OpenAI');
    }

    // Update the concept's generated_notes_mmd
    const { error: updateError } = await supabaseServer
      .from('concepts')
      .update({ generated_notes_mmd: rewrittenNotes })
      .eq('id', conceptId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      concept_id: conceptId,
      notes_markdown: rewrittenNotes,
    });
  } catch (error) {
    console.error('Error rewriting notes:', error);
    return NextResponse.json(
      {
        error: 'Failed to rewrite notes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function buildRewriteNotesPrompt(input: {
  conceptName: string;
  existingNotes: string;
  needsResearch: boolean;
  modifiers: {
    add_detail?: boolean;
    make_more_specific?: boolean;
    add_examples?: boolean;
  };
  sessionContext?: {
    title?: string;
    subject?: string;
    raw_mmd?: string | null;
  } | null;
}): string {
  const { conceptName, existingNotes, needsResearch, modifiers, sessionContext } = input;

  const modifierInstructions: string[] = [];
  if (modifiers.add_detail) {
    modifierInstructions.push('Add more detail and depth to the explanation');
  }
  if (modifiers.make_more_specific) {
    modifierInstructions.push('Make the content more specific to this topic/session context');
  }
  if (modifiers.add_examples) {
    modifierInstructions.push('Add concrete examples and/or analogies to illustrate the concept');
  }

  const modifierText =
    modifierInstructions.length > 0
      ? `\n\nApply the following modifications:\n${modifierInstructions.map((m) => `- ${m}`).join('\n')}`
      : '\n\nImprove and enhance the notes while maintaining the core content.';

  const contextText = sessionContext
    ? `\n\nSession Context:\n${sessionContext.subject ? `Subject: ${sessionContext.subject}\n` : ''}${sessionContext.title ? `Title: ${sessionContext.title}\n` : ''}`
    : '';

  const researchNote = needsResearch
    ? '\n\nNote: This concept is marked for research - ensure accuracy and depth using up-to-date information.'
    : '';

  return `Rewrite the following study notes for the concept "${conceptName}".${modifierText}${researchNote}${contextText}

Existing Notes:
\`\`\`
${existingNotes || '(No existing notes)'}
\`\`\`

Output ONLY the rewritten notes in markdown format. Do not include any explanations, comments, or JSON formatting.`;
}

