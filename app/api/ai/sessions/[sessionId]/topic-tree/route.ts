import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateTopicTree } from '@/lib/ai/generateTopicTree';
import type { Database } from '@/lib/database.types';

type ConceptInsert = Database['public']['Tables']['concepts']['Insert'];
type SubtopicInsert = Database['public']['Tables']['subtopics']['Insert'];
type TopicInsert = Database['public']['Tables']['topics']['Insert'];

/**
 * POST /api/ai/sessions/:sessionId/topic-tree
 * 
 * Job 1: SESSION_TOPIC_MAP_AND_FLAGS
 * 
 * Generates a topic tree (topics → subtopics → concepts) from session content
 * and writes it to the database.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    console.info('[AI][TopicTree] Fetch session', sessionId, 'Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Fetch session data
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, title, subject, raw_mmd')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[AI][TopicTree] Session lookup failed', {
        sessionError,
        session,
        sessionId,
      });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (!session.raw_mmd || session.raw_mmd.trim().length === 0) {
      return NextResponse.json(
        { error: 'Session has no raw_mmd content. Please upload and extract content first.' },
        { status: 400 }
      );
    }

    // Parse optional parameters from request body
    let maxTopics: number | undefined;
    let maxSubtopicsPerTopic: number | undefined;
    let maxConceptsPerSubtopic: number | undefined;

    try {
      const body = await request.json().catch(() => ({}));
      maxTopics = body.max_topics;
      maxSubtopicsPerTopic = body.max_subtopics_per_topic;
      maxConceptsPerSubtopic = body.max_concepts_per_subtopic;
    } catch {
      // Body parsing failed, use defaults
    }

    // Generate topic tree using AI
    const topicTree = await generateTopicTree({
      sessionId,
      rawMmd: session.raw_mmd,
      subject: session.subject,
      title: session.title,
      maxTopics,
      maxSubtopicsPerTopic,
      maxConceptsPerSubtopic,
    });

    // Write to database in a transaction-like manner
    // For simplicity, we'll delete existing topics/subtopics/concepts and recreate
    // In production, you might want to preserve IDs or do smarter updates

    // Delete existing topics (cascades to subtopics and concepts)
    const { error: deleteError } = await supabaseServer
      .from('topics')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('Error deleting existing topics:', deleteError);
      return NextResponse.json(
        { error: 'Failed to clear existing topics' },
        { status: 500 }
      );
    }

    // Insert topics, subtopics, and concepts
    const topicInserts: TopicInsert[] = [];
    const subtopicInserts: SubtopicInsert[] = [];
    const conceptInserts: ConceptInsert[] = [];

    for (const topicNode of topicTree.topics) {
      // Insert topic
      const { data: topic, error: topicError } = await supabaseServer
        .from('topics')
        .insert({
          session_id: sessionId,
          name: topicNode.name,
          order_index: topicNode.order_index,
        })
        .select('id')
        .single();

      if (topicError || !topic) {
        console.error('Error inserting topic:', topicError);
        return NextResponse.json(
          { error: `Failed to insert topic: ${topicNode.name}` },
          { status: 500 }
        );
      }

      // Insert subtopics
      for (const subtopicNode of topicNode.subtopics) {
        const { data: subtopic, error: subtopicError } = await supabaseServer
          .from('subtopics')
          .insert({
            session_id: sessionId,
            topic_id: topic.id,
            name: subtopicNode.name,
            order_index: subtopicNode.order_index,
          })
          .select('id')
          .single();

        if (subtopicError || !subtopic) {
          console.error('Error inserting subtopic:', subtopicError);
          return NextResponse.json(
            { error: `Failed to insert subtopic: ${subtopicNode.name}` },
            { status: 500 }
          );
        }

        // Insert concepts under this subtopic
        let conceptOrderIndex = 10;
        for (const conceptNode of subtopicNode.concepts) {
          conceptInserts.push({
            session_id: sessionId,
            topic_id: topic.id,
            subtopic_id: subtopic.id,
            name: conceptNode.name,
            needs_research: conceptNode.needs_research,
            order_index: conceptOrderIndex,
          });
          conceptOrderIndex += 10;
        }
      }

      // Insert orphan concepts (if any)
      if (topicNode.orphan_concepts && topicNode.orphan_concepts.length > 0) {
        let orphanOrderIndex = 10;
        for (const orphanConcept of topicNode.orphan_concepts) {
          conceptInserts.push({
            session_id: sessionId,
            topic_id: topic.id,
            subtopic_id: null, // Orphan concept - no subtopic
            name: orphanConcept.name,
            needs_research: orphanConcept.needs_research,
            order_index: orphanOrderIndex,
          });
          orphanOrderIndex += 10;
        }
      }
    }

    // Batch insert concepts
    if (conceptInserts.length > 0) {
      const { error: conceptError } = await supabaseServer
        .from('concepts')
        .insert(conceptInserts);

      if (conceptError) {
        console.error('Error inserting concepts:', conceptError);
        return NextResponse.json(
          { error: 'Failed to insert concepts' },
          { status: 500 }
        );
      }
    }

    // Return the generated topic tree
    return NextResponse.json({
      success: true,
      topic_tree: topicTree,
      stats: {
        topics: topicTree.topics.length,
        subtopics: topicTree.topics.reduce((sum, t) => sum + t.subtopics.length, 0),
        concepts: conceptInserts.length,
      },
    });
  } catch (error) {
    console.error('Error generating topic tree:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate topic tree',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

