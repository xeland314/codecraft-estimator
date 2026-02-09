import { GoogleGenerativeAI } from '@google/generative-ai';
import { useCallback } from 'react';

export const useGemini = () => {
  const generateContent = useCallback(
    async (apiKey: string, prompt: string, model: string = 'gemini-2.0-flash') => {
      if (!apiKey) {
        throw new Error('API key is required');
      }

      const client = new GoogleGenerativeAI(apiKey);
      const geminiModel = client.getGenerativeModel({ model });

      const response = await geminiModel.generateContent(prompt);
      return response.response.text();
    },
    []
  );

  return { generateContent };
};
