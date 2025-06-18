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

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRequirementsInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the software project.'),
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
  input: {schema: GenerateRequirementsInputSchema},
  output: {schema: GenerateRequirementsOutputSchema},
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
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
