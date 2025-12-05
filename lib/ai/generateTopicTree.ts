import { openai } from './openaiClient';
import type { TopicTreeInput, TopicTreeOutput } from './topicTree';
import { validateTopicTreeOutput } from './topicTree';

/**
 * Generates a topic tree from session content (Job 1: SESSION_TOPIC_MAP_AND_FLAGS)
 * 
 * This function:
 * 1. Reads the session's raw_mmd content
 * 2. Uses an LLM to identify topics, subtopics, and concepts
 * 3. Suggests which concepts need research (needs_research flags)
 * 4. Returns a structured topic tree
 */
export async function generateTopicTree(
  input: TopicTreeInput
): Promise<TopicTreeOutput> {
  const {
    sessionId,
    rawMmd,
    subject,
    title,
    maxTopics = 12,
    maxSubtopicsPerTopic = 6,
    maxConceptsPerSubtopic = 8,
  } = input;

  if (!rawMmd || rawMmd.trim().length === 0) {
    throw new Error('Session must have raw_mmd content to generate topic tree');
  }

  // Build the prompt for topic tree generation
  const prompt = buildTopicTreePrompt({
    sessionId,
    rawMmd,
    subject,
    title,
    maxTopics,
    maxSubtopicsPerTopic,
    maxConceptsPerSubtopic,
  });

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert educational content analyzer. Your task is to analyze study materials and extract a structured topic hierarchy.

You must output ONLY valid JSON with no additional text, comments, or explanations. The JSON must match the exact schema specified.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3, // Lower temperature for more consistent structure
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content returned from OpenAI');
  }

  console.debug(
    `[AI][TopicTree] Raw response for session ${sessionId}: ${content.substring(0, 2000)}${
      content.length > 2000 ? '…' : ''
    }`
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error}`);
  }

  // Validate and normalize the output
  return validateTopicTreeOutput(parsed, sessionId);
}

function buildTopicTreePrompt(input: {
  sessionId: string;
  rawMmd: string;
  subject?: string | null;
  title?: string;
  maxTopics: number;
  maxSubtopicsPerTopic: number;
  maxConceptsPerSubtopic: number;
}): string {
  const {
    sessionId,
    rawMmd,
    subject,
    title,
    maxTopics,
    maxSubtopicsPerTopic,
    maxConceptsPerSubtopic,
  } = input;

  return `Analyze the following study material and extract a structured topic hierarchy.

${subject ? `Subject: ${subject}\n` : ''}${title ? `Title: ${title}\n` : ''}

Study Material (Mathpix Markdown):
\`\`\`
${rawMmd.substring(0, 50000)}${rawMmd.length > 50000 ? '\n\n[... content truncated for length ...]' : ''}
\`\`\`

Your task:
1. Identify explicit topics/concepts from headings, lists, and problem statements
2. Infer implicit topics/concepts from problem content and explanations
3. Organize into a 3-level hierarchy: Topic → Subtopic → Concept
4. For each concept, determine if it needs_research (true if complex, under-explained, or implicitly identified)
5. The JSON you output must include "session_id": "${sessionId}"

Guidelines:
- Topics should be broad (e.g., "Kinematics", "Alkene Reactions")
- Subtopics should cluster related concepts (e.g., "Free Fall", "SN1 Reactions")
- Concepts should be specific, atomic study units
- Aim for ${maxTopics} topics, ${maxSubtopicsPerTopic} subtopics per topic, ${maxConceptsPerSubtopic} concepts per subtopic (these are soft targets)
- Orphan concepts (attaching directly to topics) should be rare - only use when a concept doesn't fit under any subtopic

Output format (JSON):
{
  "session_id": "${sessionId}",
  "topics": [
    {
      "name": "Topic Name",
      "order_index": 10,
      "subtopics": [
        {
          "name": "Subtopic Name",
          "order_index": 10,
          "concepts": [
            {
              "name": "Concept Name",
              "needs_research": true
            }
          ]
        }
      ],
      "orphan_concepts": [
        {
          "name": "Orphan Concept Name",
          "needs_research": false
        }
      ]
    }
  ]
}

Important:
- Output ONLY the JSON object, no markdown code blocks, no explanations
- Use order_index values like 10, 20, 30, etc. (with gaps for reordering)
- Set needs_research to true for complex concepts, under-explained concepts, or concepts identified implicitly
- Orphan concepts array is optional (only include if there are orphan concepts)`;
}

