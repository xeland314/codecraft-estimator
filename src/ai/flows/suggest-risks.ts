
'use server';
/**
 * @fileOverview An AI agent that suggests potential project risks based on a description.
 *
 * - suggestRisks - A function that handles the risk suggestion process.
 * - SuggestRisksInput - The input type for the suggestRisks function.
 * - SuggestRisksOutput - The return type for the suggestRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRisksInputSchema = z.object({
  projectDescription: z.string().describe('A description of the software project.'),
});
export type SuggestRisksInput = z.infer<typeof SuggestRisksInputSchema>;

const SuggestRisksOutputSchema = z.object({
  suggestedRisks: z.array(z.string().describe("A concise description of a potential project risk.")).describe('A list of suggested project risk descriptions.'),
});
export type SuggestRisksOutput = z.infer<typeof SuggestRisksOutputSchema>;


export async function suggestRisks(
  input: SuggestRisksInput
): Promise<SuggestRisksOutput> {
  return suggestRisksFlow(input);
}

const riskSuggestionPrompt = ai.definePrompt({
  name: 'suggestRisksPrompt',
  input: {schema: SuggestRisksInputSchema},
  output: {schema: SuggestRisksOutputSchema},
  prompt: `You are an expert project manager and risk analyst.
Based on the following project description, identify and list potential risks.
For each risk, provide a concise description (around 5-15 words).
Focus on common software project risks related to technology, team, scope, timeline, and external factors.
Output a list of these risk descriptions.

Project Description:
{{{projectDescription}}}

Return the output as a JSON object matching the provided schema.
`,
});

const suggestRisksFlow = ai.defineFlow(
  {
    name: 'suggestRisksFlow',
    inputSchema: SuggestRisksInputSchema,
    outputSchema: SuggestRisksOutputSchema,
  },
  async input => {
    if (!input.projectDescription || input.projectDescription.trim() === "") {
        return { suggestedRisks: [] };
    }
    const {output} = await riskSuggestionPrompt(input);
    if (!output) {
        // Consider logging this or handling it more gracefully if the AI consistently fails.
        // For now, returning an empty list if AI provides no output.
        return { suggestedRisks: [] };
    }
    return output;
  }
);
