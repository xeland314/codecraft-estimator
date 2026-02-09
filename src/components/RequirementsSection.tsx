
"use client";

import type * as React from 'react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Loader2, KeyRound } from 'lucide-react';
import { generateProjectPlan, type GenerateProjectPlanOutput } from '@/ai/flows/generate-project-plan';
import { useToast } from '@/hooks/use-toast';
import type { Module, Task, TimeUnit } from '@/types';
import { calculateWeightedAverage } from '@/lib/timeUtils';
import { Badge } from "@/components/ui/badge";

interface RequirementsSectionProps {
  requirementsDocument: string;
  setRequirementsDocument: (doc: string) => void;
  setModules: React.Dispatch<React.SetStateAction<Module[]>>;
  apiKey: string;
}

export default function RequirementsSection({ requirementsDocument, setRequirementsDocument, setModules, apiKey }: Readonly<RequirementsSectionProps>) {
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleGenerateProjectPlan = async () => {
    console.log("Generating project plan. API Key present:", !!apiKey);
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
      const result: GenerateProjectPlanOutput = await generateProjectPlan({
        prompt,
        apiKey: apiKey || undefined
      });
      setRequirementsDocument(result.requirementDocument);

      const newModules: Module[] = result.modules.map(aiModule => {
        const tasks: Task[] = aiModule.tasks.map(aiTask => {
          // AI provides times in hours, calculateWeightedAverage expects numbers
          const optimisticTime = Number(aiTask.optimisticTime);
          const mostLikelyTime = Number(aiTask.mostLikelyTime);
          const pessimisticTime = Number(aiTask.pessimisticTime);

          const weightedAverageDecimal = calculateWeightedAverage(
            optimisticTime,
            mostLikelyTime,
            pessimisticTime,
            'hours' // AI provides times in hours
          );
          return {
            id: crypto.randomUUID(),
            description: aiTask.description,
            category: aiTask.category,
            optimisticTime: optimisticTime,
            mostLikelyTime: mostLikelyTime,
            pessimisticTime: pessimisticTime,
            timeUnit: 'hours' as TimeUnit, // Explicitly set as AI provides in hours
            weightedAverageTimeInMinutes: weightedAverageDecimal,
          };
        });
        return {
          id: crypto.randomUUID(),
          name: aiModule.name,
          tasks,
        };
      });
      setModules(newModules); // Update modules in the main page state

      toast({
        title: "Project Plan Generated",
        description: "Requirements document and initial modules/tasks have been generated.",
      });
    } catch (error) {
      console.error("Error generating project plan:", error);
      toast({
        title: "Error",
        description: "Failed to generate project plan. Please try again.",
        variant: "destructive",
      });
      setRequirementsDocument('');
      setModules([]); // Clear modules on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl flex items-center">
              <Lightbulb className="mr-2 h-6 w-6 text-primary" />
              AI-Powered Project Plan Generation
            </CardTitle>
            <CardDescription>
              Describe your software project, and our AI will generate a requirements document and initial modules/tasks.
            </CardDescription>
          </div>
          {apiKey ? (
            <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-200 bg-green-50">
              <KeyRound className="h-3 w-3" /> Custom Key Active
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground border-border bg-muted/50">
              No Custom Key
            </Badge>
          )}
        </div>
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
          onClick={handleGenerateProjectPlan}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
          aria-label="Generate Project Plan"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          Generate Project Plan
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
