'use server';
/**
 * @fileOverview An AI agent that generates a software requirements document
 *               and extracts modules and tasks from it.
 * Using Google AI JavaScript SDK instead of Genkit.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const TaskSchema = z.object({
  description: z.string().describe('Task description (e.g., Design user registration UI)'),
  optimisticTime: z.number().describe('Optimistic time estimate in hours.'),
  mostLikelyTime: z.number().describe('Most likely time estimate in hours.'),
  pessimisticTime: z.number().describe('Pessimistic time estimate in hours.'),
});

const ModuleSchema = z.object({
  name: z.string().describe('Module Name (e.g., FR1: User Authentication)'),
  tasks: z.array(TaskSchema).describe('List of tasks for this module.'),
});

const GenerateProjectPlanInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the software project.'),
  apiKey: z.string().optional().describe('Optional Gemini API Key provided by the user.'),
});
export type GenerateProjectPlanInput = z.infer<typeof GenerateProjectPlanInputSchema>;

const GenerateProjectPlanOutputSchema = z.object({
  requirementDocument: z.string().describe('A comprehensive software requirement document.'),
  modules: z.array(ModuleSchema).describe('A list of modules extracted from the requirements document, with tasks and time estimates in hours.'),
});
export type GenerateProjectPlanOutput = z.infer<typeof GenerateProjectPlanOutputSchema>;

export async function generateProjectPlan(input: GenerateProjectPlanInput): Promise<GenerateProjectPlanOutput> {
  // Use provided API key or fall back to environment variable
  const apiKey = input.apiKey || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No API key provided. Please provide apiKey in input or set GOOGLE_GENAI_API_KEY environment variable.');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemPrompt = `You are an expert software project manager and technical analyst.
Based on the user's project description, you will perform two tasks:
1. Generate a comprehensive software requirements document. The document should be well-structured, detailing functional requirements (FR), non-functional requirements (NFR), security considerations (SEC), and deployment aspects. Use standard requirement IDs like FR1, NFR1, SEC1, etc.
2. Extract a list of modules and tasks directly from the generated requirements document.
   - Module names should correspond to major sections or distinct functionalities identified in the requirements (e.g., "FR1: User Authentication", "NFR2: Performance").
   - For each module, list specific, actionable tasks required to implement it.
   - For each task, provide an optimistic, a most likely, and a pessimistic time estimate **in hours**. The time unit for all tasks must be 'hours'.
   - Phrase task descriptions clearly.

Your output MUST be a valid JSON object matching this exact structure:
{
  "requirementDocument": "...full requirements document here...",
  "modules": [
    {
      "name": "FR1: User Authentication",
      "tasks": [
        {
          "description": "Design login UI",
          "optimisticTime": 4,
          "mostLikelyTime": 6,
          "pessimisticTime": 10
        }
      ]
    }
  ]
}`;

  const userPrompt = `Project Description: ${input.prompt}`;

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
        maxOutputTokens: 8192,
      },
    });

    const responseText = response.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      throw new Error('Failed to extract JSON from response');
    }

    const result = JSON.parse(jsonMatch[0]);
    const validated = GenerateProjectPlanOutputSchema.parse(result);
    return validated;
  } catch (error) {
    console.error('Error in generateProjectPlan:', error);
    throw new Error(`Failed to generate project plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
