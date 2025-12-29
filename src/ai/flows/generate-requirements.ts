// This file is machine-generated - edit with caution!
// This flow is superseded by generate-project-plan.ts and can be removed or kept for reference.
// For this exercise, we will leave it but it's not actively used by the UI anymore.
'use server';
/**
 * @fileOverview An AI agent that generates software requirements documents.
 *
 * - generateRequirements - A function that handles the requirement generation process.
 * - GenerateRequirementsInput - The input type for the generateRequirements function.
 * - GenerateRequirementsOutput - The return type for the generateRequirements function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateRequirementsInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the software project.'),
  apiKey: z.string().optional().describe('Optional Gemini API Key provided by the user.'),
});
export type GenerateRequirementsInput = z.infer<typeof GenerateRequirementsInputSchema>;

const GenerateRequirementsOutputSchema = z.object({
  requirementDocument: z
    .string()
    .describe('A comprehensive software requirement document.'),
});
export type GenerateRequirementsOutput = z.infer<typeof GenerateRequirementsOutputSchema>;

export async function generateRequirements(
  input: GenerateRequirementsInput
): Promise<GenerateRequirementsOutput> {
  return generateRequirementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRequirementsPrompt',
    model:   googleAI.model('gemini-2.5-flash'),
  input: { schema: GenerateRequirementsInputSchema },
  output: { schema: GenerateRequirementsOutputSchema },
  prompt: `You are an expert software project manager.

You will generate a comprehensive software requirement document based on the user's prompt, incorporating best practices for functional and non-functional requirements, security, and deployment.

Project Description: {{{prompt}}}`,
});

const generateRequirementsFlow = ai.defineFlow(
  {
    name: 'generateRequirementsFlow',
    inputSchema: GenerateRequirementsInputSchema,
    outputSchema: GenerateRequirementsOutputSchema,
  },
  async (input) => {
    if (input.apiKey) {
      console.log("Using custom API key for generateRequirements");

      const response = await ai.generate({
        model: googleAI.model('gemini-2.5-flash'),
        prompt: `You are an expert software project manager.

You will generate a comprehensive software requirement document based on the user's prompt, incorporating best practices for functional and non-functional requirements, security, and deployment.

Project Description: ${input.prompt}`,
        config: {
          apiKey: input.apiKey, // Use a different API key for this request
        },
        output: { schema: GenerateRequirementsOutputSchema },
      });
      return response.output!;
    }

    // Default path
    const { output } = await prompt(input);
    return output!;
  }
);
