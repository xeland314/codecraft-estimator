'use server';
/**
 * @fileOverview An AI agent that generates software requirements documents.
 * Using Google AI JavaScript SDK instead of Genkit.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const GenerateRequirementsInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the software project.'),
  apiKey: z.string().optional().describe('Optional Gemini API Key provided by the user.'),
});
export type GenerateRequirementsInput = z.infer<typeof GenerateRequirementsInputSchema>;

const GenerateRequirementsOutputSchema = z.object({
  requirementDocument: z.string().describe('A comprehensive software requirement document.'),
});
export type GenerateRequirementsOutput = z.infer<typeof GenerateRequirementsOutputSchema>;

export async function generateRequirements(input: GenerateRequirementsInput): Promise<GenerateRequirementsOutput> {
  // Use provided API key or fall back to environment variable
  const apiKey = input.apiKey || process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No API key provided. Please provide apiKey in input or set GOOGLE_GENAI_API_KEY environment variable.');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemPrompt = `You are an expert software project manager.

You will generate a comprehensive software requirement document based on the user's prompt, incorporating best practices for functional and non-functional requirements, security, and deployment.`;

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
        maxOutputTokens: 4096,
      },
    });

    const requirementDocument = response.response.text();
    const validated = GenerateRequirementsOutputSchema.parse({ requirementDocument });
    return validated;
  } catch (error) {
    console.error('Error in generateRequirements:', error);
    throw new Error(`Failed to generate requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
