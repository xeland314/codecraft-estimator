"use client";

import type * as React from 'react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2 } from 'lucide-react';
import { generateRequirements, type GenerateRequirementsOutput } from '@/ai/flows/generate-requirements';
import { useToast } from '@/hooks/use-toast';

interface RequirementsSectionProps {
  requirementsDocument: string;
  setRequirementsDocument: (doc: string) => void;
}

export default function RequirementsSection({ requirementsDocument, setRequirementsDocument }: RequirementsSectionProps) {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleGenerateRequirements = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a project description to generate requirements.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const result: GenerateRequirementsOutput = await generateRequirements({ prompt });
      setRequirementsDocument(result.requirementDocument);
      toast({
        title: "Requirements Generated",
        description: "The software requirements document has been successfully generated.",
      });
    } catch (error) {
      console.error("Error generating requirements:", error);
      toast({
        title: "Error",
        description: "Failed to generate requirements. Please try again.",
        variant: "destructive",
      });
      setRequirementsDocument(''); // Clear previous document on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <Lightbulb className="mr-2 h-6 w-6 text-primary" />
          AI-Powered Requirements Generation
        </CardTitle>
        <CardDescription>
          Describe your software project, and our AI will generate a comprehensive requirements document.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="requirements-prompt" className="block text-sm font-medium text-foreground">
            Project Description Prompt
          </label>
          <Textarea
            id="requirements-prompt"
            placeholder="e.g., A mobile app for tracking personal fitness goals with social sharing features..."
            value={prompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            className="min-h-[100px] focus:ring-accent"
            aria-label="Project Description Prompt"
          />
        </div>
        <Button 
          onClick={handleGenerateRequirements} 
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
          aria-label="Generate Requirements Document"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          Generate Requirements
        </Button>
        {requirementsDocument && (
          <div className="space-y-2 pt-4">
            <h3 className="font-headline text-xl font-semibold">Generated Requirements Document:</h3>
            <Card className="bg-secondary p-4 max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-secondary-foreground break-words">
                {requirementsDocument}
              </pre>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
