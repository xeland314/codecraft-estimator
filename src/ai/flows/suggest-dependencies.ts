'use server';
/**
 * @fileOverview An AI agent that suggests dependencies between tasks.
 * Using Google AI JavaScript SDK.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const SuggestDependenciesInputSchema = z.object({
  modules: z.array(
    z.object({
      name: z.string(),
      tasks: z.array(
        z.object({
          id: z.string(),
          description: z.string(),
          category: z.string().optional(),
        })
      ),
    })
  ),
  apiKey: z.string().optional().describe('Optional Gemini API Key provided by the user.'),
});
export type SuggestDependenciesInput = z.infer<typeof SuggestDependenciesInputSchema>;

const DependencySuggestionSchema = z.object({
  taskId: z.string().describe('The ID of the task'),
  predecessorTaskIds: z.array(z.string()).describe('IDs of tasks that must be completed before this task'),
});

const SuggestDependenciesOutputSchema = z.object({
  suggestions: z.array(DependencySuggestionSchema).describe('Suggested dependencies for each task'),
});
export type SuggestDependenciesOutput = z.infer<typeof SuggestDependenciesOutputSchema>;

export async function suggestDependencies(input: SuggestDependenciesInput): Promise<SuggestDependenciesOutput> {
  const apiKey = input.apiKey || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No API key provided. Please provide apiKey in input or set GOOGLE_GENAI_API_KEY environment variable.');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Format tasks for the prompt
  const tasksDescription = input.modules
    .map(m => {
      const taskLines = m.tasks.map(t => `  - [${t.id}] ${t.description} (${t.category || 'Other'})`).join('\n');
      return `Module: ${m.name}\n${taskLines}`;
    })
    .join('\n\n');

  const systemPrompt = `You are a project management expert. Analyze the provided tasks and suggest logical dependencies between them.
A dependency means task B cannot start until task A is finished.

Consider:
- Design tasks should precede development tasks
- API development should precede frontend/backend development that uses it
- Database design should precede tests that use the database
- Backend development should generally precede testing
- Security tasks often need to be done before deployment

Be conservative: only suggest dependencies that are clearly necessary. Don't over-constrain the project.`;

  const userPrompt = `Here are the project tasks:

${tasksDescription}

Analyze these tasks and suggest which tasks should have dependencies on other tasks.
Return ONLY a valid JSON object matching this structure:
{
  "suggestions": [
    {
      "taskId": "task-id-here",
      "predecessorTaskIds": ["predecessor-task-id-1", "predecessor-task-id-2"]
    }
  ]
}

Include a suggestion for each task that has predecessors. Tasks with no predecessors should not be in the array.`;

  try {
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 3000,
      },
    });

    const responseText = response.response.text();

    // Extract JSON from response
    const jsonRegex = /\{[\s\S]*\}/;
    const jsonMatch = jsonRegex.exec(responseText);
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      return { suggestions: [] };
    }

    const result = JSON.parse(jsonMatch[0]);
    const validated = SuggestDependenciesOutputSchema.parse(result);
    return validated;
  } catch (error) {
    console.error('Error in suggestDependencies:', error);
    throw new Error(`Failed to suggest dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
