import { openai } from './openaiClient';
import type { ContentGenerationOutput } from './contentGeneration';
import { validateContentGenerationOutput } from './contentGeneration';
import type { Database } from '@/lib/database.types';

type Concept = Database['public']['Tables']['concepts']['Row'];

export interface GenerateContentInput {
  sessionId: string;
  concepts: Concept[];
  rawMmd: string | null;
  subject?: string | null;
  title: string;
}

/**
 * Generates content (notes, quiz questions, word game entries) for concepts (Job 2)
 * 
 * This function:
 * 1. Takes a list of concepts to generate content for
 * 2. Uses an LLM to generate notes, MCQs, and word game entries
 * 3. Returns structured content ready to be written to the database
 */
export async function generateContent(
  input: GenerateContentInput
): Promise<ContentGenerationOutput> {
  const { sessionId, concepts, rawMmd, subject, title } = input;

  if (concepts.length === 0) {
    throw new Error('No concepts provided for content generation');
  }

  // Build the prompt for content generation
  const prompt = buildContentGenerationPrompt({
    sessionId,
    concepts,
    rawMmd,
    subject,
    title,
  });

  // Determine if any concepts need research
  const needsResearch = concepts.some((c) => c.needs_research);

  // Call OpenAI with research capability if needed
  const model = needsResearch ? 'gpt-4o' : 'gpt-4o'; // Use same model for now, can add browsing later

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are an expert educational content creator. Your task is to generate high-quality study materials including notes, quiz questions, and word game entries.

You must output ONLY valid JSON with no additional text, comments, or explanations. The JSON must match the exact schema specified.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7, // Slightly higher for more creative questions
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content returned from OpenAI');
  }

  console.debug(
    `[AI][ContentGeneration] Raw response for session ${sessionId}: ${content.substring(0, 2000)}${
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
  const expectedConceptIds = concepts.map((c) => c.id);
  return validateContentGenerationOutput(parsed, sessionId, expectedConceptIds);
}

function buildContentGenerationPrompt(input: {
  sessionId: string;
  concepts: Concept[];
  rawMmd: string | null;
  subject?: string | null;
  title?: string;
}): string {
  const { sessionId, concepts, rawMmd, subject, title } = input;

  const conceptsList = concepts
    .map((c) => {
      const researchFlag = c.needs_research ? ' [NEEDS RESEARCH - use web browsing if available]' : '';
      return `- ${c.name} (concept_id: ${c.id})${researchFlag}`;
    })
    .join('\n');

  const mmdContext = rawMmd
    ? `\n\nStudy Material Context (Mathpix Markdown - use for context, terminology, and emphasis):
\`\`\`
${rawMmd.substring(0, 30000)}${rawMmd.length > 30000 ? '\n\n[... content truncated for length ...]' : ''}
\`\`\``
    : '';

  return `Generate study content for the following concepts.

${subject ? `Subject: ${subject}\n` : ''}${title ? `Title: ${title}\n` : ''}

Concepts to generate content for:
${conceptsList}${mmdContext}

For each concept, generate:
1. **Notes** (markdown): Focused, exam-oriented explanations. Use short sections, bullet points, and simple headings. Focus on what a student needs to solve problems quickly.
2. **Quiz Questions** (2-4 MCQs per concept): Avoid trivial definition recall. Include conceptual understanding and application questions. Make options distinct and clear.
3. **Word Game Entries** (1-2 per concept, max 4 total): Word + clue pairs. Words should be >= 4 characters, uppercase. Clues should be unambiguous but not give away the answer immediately.

For concepts marked [NEEDS RESEARCH], use web browsing (if available) or your most up-to-date knowledge to ensure accuracy and depth.

Output format (JSON):
{
  "session_id": "${sessionId}",
  "scope": "session",
  "concepts": [
    {
      "concept_id": "concept-uuid-from-list-above",
      "notes_markdown": "### Concept Name\n\nDetailed markdown notes...",
      "quiz_questions": [
        {
          "question_text": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_option_index": 1,
          "explanation": "Explanation of the correct answer..."
        }
      ],
      "word_game_entries": [
        {
          "word": "ANSWER",
          "clue": "Clue text here",
          "order_index": 10
        }
      ]
    }
  ]
}

Important:
- Output ONLY the JSON object, no markdown code blocks, no explanations
- Use the exact session_id "${sessionId}"
- For each concept listed above, output exactly one object whose concept_id matches the provided UUID.
- Do not invent new concepts or omit any provided concept_ids
- Generate 2-4 quiz questions per concept
- Generate 1-2 word game entries per concept (max 4 total per concept)
- Use order_index values 10, 20, 30, or 40 for word game entries
- Notes should be comprehensive but concise, exam-focused
- Quiz questions should test understanding, not just recall`;
}
