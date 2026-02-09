'use server';
/**
 * @fileOverview Augments a module with additional tasks and adjusted time estimates based on a prompt.
 * Using Google AI JavaScript SDK instead of Genkit.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const AugmentTasksInputSchema = z.object({
  moduleDescription: z
    .string()
    .describe('The description of the module to augment.'),
  existingTasks: z
    .string()
    .describe('The existing tasks in the module, as a string.'),
  prompt: z.string().describe('A prompt to guide the addition of more tasks to the current module and adjust task times.'),
  apiKey: z.string().optional().describe('Optional Gemini API Key provided by the user.'),
});
export type AugmentTasksInput = z.infer<typeof AugmentTasksInputSchema>;

const AugmentTasksOutputSchema = z.object({
  augmentedTasks: z.array(
    z.object({
      description: z.string(),
      category: z.enum([
        'Design',
        'Development (Frontend)',
        'Development (Backend)',
        'API Development',
        'Database',
        'Testing/QA',
        'Deployment',
        'Management',
        'Documentation',
        'Research',
        'Communication',
        'Other',
      ]),
      optimisticTime: z.number(),
      mostLikelyTime: z.number(),
      pessimisticTime: z.number(),
    })
  ).describe('The augmented tasks with categories and adjusted time estimates.'),
});
export type AugmentTasksOutput = z.infer<typeof AugmentTasksOutputSchema>;



export async function augmentTasks(input: AugmentTasksInput): Promise<AugmentTasksOutput> {
  // Use provided API key or fall back to environment variable
  const apiKey = input.apiKey || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No API key provided. Please provide apiKey in input or set GOOGLE_GENAI_API_KEY environment variable.');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemPrompt = `You are a project management assistant. You will be provided with a module description, a list of existing tasks, and a prompt.
Your job is to augment the existing tasks with new tasks and adjusted time estimates based on the prompt.
For each task, assign ONE of these categories: Design, Development (Frontend), Development (Backend), API Development, Database, Testing/QA, Deployment, Management, Documentation, Research, Communication, or Other.
Return the augmented tasks with categories and adjusted time estimates as a JSON array.`;

  const userPrompt = `Module Description: ${input.moduleDescription}

Existing Tasks: ${input.existingTasks}

Augmentation Prompt: ${input.prompt}

Return ONLY a valid JSON array of task objects like:
[
  {
    "description": "Task description",
    "category": "Design",
    "optimisticTime": 4,
    "mostLikelyTime": 6,
    "pessimisticTime": 10
  }
]`;

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
        maxOutputTokens: 2048,
      },
    });

    const augmentedTasksJson = response.response.text();
    
    // Extract JSON array from response
    const jsonRegex = /\[[\s\S]*\]/;
    const jsonMatch = jsonRegex.exec(augmentedTasksJson);
    if (!jsonMatch) {
      console.error('No JSON array found in response:', augmentedTasksJson);
      throw new Error('Failed to extract task array from response');
    }

    const result = JSON.parse(jsonMatch[0]);
    const validated = AugmentTasksOutputSchema.parse({ augmentedTasks: result });
    return validated;
  } catch (error) {
    console.error('Error in augmentTasks:', error);
    throw new Error(`Failed to augment tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
