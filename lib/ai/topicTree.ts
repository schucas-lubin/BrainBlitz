/**
 * Types and utilities for topic tree generation (Job 1)
 */

export interface TopicTreeInput {
  sessionId: string;
  rawMmd: string | null;
  subject?: string | null;
  title: string;
  maxTopics?: number;
  maxSubtopicsPerTopic?: number;
  maxConceptsPerSubtopic?: number;
}

export interface TopicTreeNode {
  name: string;
  order_index: number;
  subtopics: SubtopicNode[];
  orphan_concepts?: OrphanConceptNode[];
}

export interface SubtopicNode {
  name: string;
  order_index: number;
  concepts: ConceptNode[];
}

export interface ConceptNode {
  name: string;
  needs_research: boolean;
}

export interface OrphanConceptNode {
  name: string;
  needs_research: boolean;
}

export interface TopicTreeOutput {
  session_id: string;
  topics: TopicTreeNode[];
}

/**
 * Validates and normalizes the topic tree output from the LLM
 */
export function validateTopicTreeOutput(
  output: unknown,
  sessionId: string
): TopicTreeOutput {
  if (typeof output !== 'object' || output === null) {
    throw new Error('Topic tree output must be an object');
  }

  const obj = output as Record<string, unknown>;

  if (obj.session_id !== sessionId) {
    throw new Error(`Session ID mismatch: expected ${sessionId}, got ${obj.session_id}`);
  }

  if (!Array.isArray(obj.topics)) {
    throw new Error('Topics must be an array');
  }

  const topics: TopicTreeNode[] = [];

  for (const topic of obj.topics) {
    if (typeof topic !== 'object' || topic === null) {
      throw new Error('Each topic must be an object');
    }

    const topicObj = topic as Record<string, unknown>;

    if (typeof topicObj.name !== 'string') {
      throw new Error('Topic name must be a string');
    }

    const orderIndex = typeof topicObj.order_index === 'number' 
      ? topicObj.order_index 
      : topics.length * 10 + 10;

    const subtopics: SubtopicNode[] = [];
    if (Array.isArray(topicObj.subtopics)) {
      for (let i = 0; i < topicObj.subtopics.length; i++) {
        const subtopic = topicObj.subtopics[i];
        if (typeof subtopic !== 'object' || subtopic === null) {
          throw new Error(`Subtopic at index ${i} must be an object`);
        }

        const subtopicObj = subtopic as Record<string, unknown>;
        if (typeof subtopicObj.name !== 'string') {
          throw new Error(`Subtopic name at index ${i} must be a string`);
        }

        const subtopicOrderIndex = typeof subtopicObj.order_index === 'number'
          ? subtopicObj.order_index
          : subtopics.length * 10 + 10;

        const concepts: ConceptNode[] = [];
        if (Array.isArray(subtopicObj.concepts)) {
          for (const concept of subtopicObj.concepts) {
            if (typeof concept !== 'object' || concept === null) {
              throw new Error('Each concept must be an object');
            }
            const conceptObj = concept as Record<string, unknown>;
            if (typeof conceptObj.name !== 'string') {
              throw new Error('Concept name must be a string');
            }
            concepts.push({
              name: conceptObj.name,
              needs_research: Boolean(conceptObj.needs_research),
            });
          }
        }

        subtopics.push({
          name: subtopicObj.name,
          order_index: subtopicOrderIndex,
          concepts,
        });
      }
    }

    const orphanConcepts: OrphanConceptNode[] = [];
    if (Array.isArray(topicObj.orphan_concepts)) {
      for (const concept of topicObj.orphan_concepts) {
        if (typeof concept !== 'object' || concept === null) {
          throw new Error('Each orphan concept must be an object');
        }
        const conceptObj = concept as Record<string, unknown>;
        if (typeof conceptObj.name !== 'string') {
          throw new Error('Orphan concept name must be a string');
        }
        orphanConcepts.push({
          name: conceptObj.name,
          needs_research: Boolean(conceptObj.needs_research),
        });
      }
    }

    topics.push({
      name: topicObj.name,
      order_index: orderIndex,
      subtopics,
      orphan_concepts: orphanConcepts.length > 0 ? orphanConcepts : undefined,
    });
  }

  return {
    session_id: sessionId,
    topics,
  };
}

