
'use server';
/**
 * @fileOverview An AI agent that generates a software requirements document
 *               and extracts modules and tasks from it.
 *
 * - generateProjectPlan - A function that handles the project plan generation process.
 * - GenerateProjectPlanInput - The input type for the generateProjectPlan function.
 * - GenerateProjectPlanOutput - The return type for the generateProjectPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateProjectPlanInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the software project.'),
  apiKey: z.string().optional().describe('Optional Gemini API Key provided by the user.'),
});
export type GenerateProjectPlanInput = z.infer<typeof GenerateProjectPlanInputSchema>;

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

const GenerateProjectPlanOutputSchema = z.object({
  requirementDocument: z
    .string()
    .describe('A comprehensive software requirement document.'),
  modules: z
    .array(ModuleSchema)
    .describe(
      'A list of modules extracted from the requirements document, with tasks and time estimates in hours.'
    ),
});
export type GenerateProjectPlanOutput = z.infer<typeof GenerateProjectPlanOutputSchema>;


export async function generateProjectPlan(
  input: GenerateProjectPlanInput
): Promise<GenerateProjectPlanOutput> {
  return generateProjectPlanFlow(input);
}

const projectPlanPrompt = ai.definePrompt({
  name: 'generateProjectPlanPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: GenerateProjectPlanInputSchema },
  output: { schema: GenerateProjectPlanOutputSchema },
  prompt: `You are an expert software project manager and technical analyst.
Based on the user's project description, you will perform two tasks:
1.  Generate a comprehensive software requirements document. The document should be well-structured, detailing functional requirements (FR), non-functional requirements (NFR), security considerations (SEC), and deployment aspects. Use standard requirement IDs like FR1, NFR1, SEC1, etc.
2.  Extract a list of modules and tasks directly from the generated requirements document.
    *   Module names should correspond to major sections or distinct functionalities identified in the requirements (e.g., "FR1: User Authentication", "NFR2: Performance").
    *   For each module, list specific, actionable tasks required to implement it.
    *   For each task, provide an optimistic, a most likely, and a pessimistic time estimate **in hours**. The time unit for all tasks must be 'hours'.
    *   Phrase task descriptions clearly.

Project Description: {{{prompt}}}

Your output MUST be a JSON object matching the schema provided for the output. Ensure the time estimates are reasonable for software development tasks.
`,
});

const generateProjectPlanFlow = ai.defineFlow(
  {
    name: 'generateProjectPlanFlow',
    inputSchema: GenerateProjectPlanInputSchema,
    outputSchema: GenerateProjectPlanOutputSchema,
  },
  async (input) => {
    let promptFn = projectPlanPrompt;

    if (input.apiKey) {
      console.log("Using custom API key for generateProjectPlan. Key length:", input.apiKey.length);

      // Use generate directly to avoid prompt registration issues and for simplicity
      const response = await ai.generate({
        model: googleAI.model('gemini-2.5-flash'), 
        prompt: `You are an expert software project manager and technical analyst.
Based on the user's project description, you will perform two tasks:
1.  Generate a comprehensive software requirements document. The document should be well-structured, detailing functional requirements (FR), non-functional requirements (NFR), security considerations (SEC), and deployment aspects. Use standard requirement IDs like FR1, NFR1, SEC1, etc.
2.  Extract a list of modules and tasks directly from the generated requirements document.
    *   Module names should correspond to major sections or distinct functionalities identified in the requirements (e.g., "FR1: User Authentication", "NFR2: Performance").
    *   For each module, list specific, actionable tasks required to implement it.
    *   For each task, provide an optimistic, a most likely, and a pessimistic time estimate **in hours**. The time unit for all tasks must be 'hours'.
    *   Phrase task descriptions clearly.

Project Description: ${input.prompt}

Your output MUST be a JSON object matching the schema provided for the output. Ensure the time estimates are reasonable for software development tasks.
`,
        config: {
          apiKey: input.apiKey, // Use a different API key for this request
        },
        output: { schema: GenerateProjectPlanOutputSchema },
      });

      if (!response) {
        throw new Error("AI failed to generate project plan using custom key.");
      }
      return response.output!;
    }

    console.log("Using default API key/env var for generateProjectPlan");

    const { output } = await promptFn(input);
    if (!output) {
      throw new Error("AI failed to generate project plan.");
    }
    return output;
  }
);
