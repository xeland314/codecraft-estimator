
'use server';
/**
 * @fileOverview An AI agent that suggests potential project risks based on a description.
 *
 * - suggestRisks - A function that handles the risk suggestion process.
 * - SuggestRisksInput - The input type for the suggestRisks function.
 * - SuggestRisksOutput - The return type for the suggestRisks function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const SuggestRisksInputSchema = z.object({
  projectDescription: z.string().describe('A description of the software project.'),
  apiKey: z.string().optional().describe('Optional Gemini API Key provided by the user.'),
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
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: SuggestRisksInputSchema },
  output: { schema: SuggestRisksOutputSchema },
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
  async (input) => {
    if (!input.projectDescription || input.projectDescription.trim() === "") {
      return { suggestedRisks: [] };
    }

    if (input.apiKey) {
      console.log("Using custom API key for suggestRisks");
      
      const response = await ai.generate({
        model: googleAI.model('gemini-2.5-flash'),
        prompt: `You are an expert project manager and risk analyst.
Based on the following project description, identify and list potential risks.
For each risk, provide a concise description (around 5-15 words).
Focus on common software project risks related to technology, team, scope, timeline, and external factors.
Output a list of these risk descriptions.

Project Description:
${input.projectDescription}

Return the output as a JSON object matching the provided schema.
`,
        config: {
          apiKey: input.apiKey, // Use a different API key for this request
        },
        output: { schema: SuggestRisksOutputSchema },
      });

      if (!response) {
        return { suggestedRisks: [] };
      }
      return response.output!;
    }

    // Default path
    const { output } = await riskSuggestionPrompt(input);
    if (!output) {
      return { suggestedRisks: [] };
    }
    return output;
  }
);
