'use server';
/**
 * @fileOverview An AI agent that suggests potential project risks based on a description.
 * Using Google AI JavaScript SDK instead of Genkit.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const SuggestRisksInputSchema = z.object({
  projectDescription: z.string().describe('A description of the software project.'),
  apiKey: z.string().optional().describe('Optional Gemini API Key provided by the user.'),
});
export type SuggestRisksInput = z.infer<typeof SuggestRisksInputSchema>;

const SuggestRisksOutputSchema = z.object({
  suggestedRisks: z.array(z.string().describe("A concise description of a potential project risk.")).describe('A list of suggested project risk descriptions.'),
});
export type SuggestRisksOutput = z.infer<typeof SuggestRisksOutputSchema>;

export async function suggestRisks(input: SuggestRisksInput): Promise<SuggestRisksOutput> {
  if (!input.projectDescription || input.projectDescription.trim() === '') {
    return { suggestedRisks: [] };
  }

  // Use provided API key or fall back to environment variable
  const apiKey = input.apiKey || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No API key provided. Please provide apiKey in input or set GOOGLE_GENAI_API_KEY environment variable.');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemPrompt = `You are an expert project manager and risk analyst.
Based on the following project description, identify and list potential risks.
For each risk, provide a concise description (around 5-15 words).
Focus on common software project risks related to technology, team, scope, timeline, and external factors.

Output ONLY a valid JSON object with this exact structure:
{
  "suggestedRisks": ["risk1", "risk2", "risk3", ...]
}`;

  const userPrompt = `Project Description:
${input.projectDescription}`;

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
        maxOutputTokens: 1024,
      },
    });

    const responseText = response.response.text();
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      return { suggestedRisks: [] };
    }

    const result = JSON.parse(jsonMatch[0]);
    const validated = SuggestRisksOutputSchema.parse(result);
    return validated;
  } catch (error) {
    console.error('Error in suggestRisks:', error);
    throw new Error(`Failed to generate risks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
