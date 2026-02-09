"use client";

import type * as React from 'react';
import { useState } from 'react';
import type { Module, Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch, AlertCircle, Loader2, Zap } from 'lucide-react';
import { calculateCriticalPath, hasCyclicDependencies } from '@/lib/criticalPath';
import { suggestDependencies, type SuggestDependenciesOutput } from '@/ai/flows/suggest-dependencies';
import { useToast } from '@/hooks/use-toast';
import { formatTime } from '@/lib/timeUtils';
import { Decimal } from 'decimal.js';

interface CriticalPathSectionProps {
  modules: Module[];
  setModules: React.Dispatch<React.SetStateAction<Module[]>>;
  apiKey: string;
}

export default function CriticalPathSection({ modules, setModules, apiKey }: CriticalPathSectionProps) {
  const [selectedTaskForDep, setSelectedTaskForDep] = useState<string | null>(null);
  const [selectedPredecessor, setSelectedPredecessor] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggestingDeps, setIsSuggestingDeps] = useState(false);
  const { toast } = useToast();

  // Get all tasks with their module context
  const allTasks = modules.flatMap(m =>
    m.tasks.map(t => ({ ...t, moduleName: m.name, moduleId: m.id }))
  );

  // Check for cycles
  const hasCycles = hasCyclicDependencies(modules);

  // Calculate critical path
  const criticalPath = calculateCriticalPath(modules);

  const handleAddDependency = () => {
    if (!selectedTaskForDep || !selectedPredecessor) {
      toast({ title: "Error", description: "Please select both a task and a predecessor.", variant: "destructive" });
      return;
    }

    if (selectedTaskForDep === selectedPredecessor) {
      toast({ title: "Error", description: "A task cannot depend on itself.", variant: "destructive" });
      return;
    }

    setModules(prev =>
      prev.map(m => ({
        ...m,
        tasks: m.tasks.map(t => {
          if (t.id === selectedTaskForDep) {
            const predecessors = t.predecessorTaskIds || [];
            if (!predecessors.includes(selectedPredecessor)) {
              return {
                ...t,
                predecessorTaskIds: [...predecessors, selectedPredecessor],
              };
            }
          }
          return t;
        }),
      }))
    );

    toast({ title: "Dependency Added", description: "Task dependency has been added." });
    setSelectedTaskForDep(null);
    setSelectedPredecessor(null);
  };

  const handleRemoveDependency = (taskId: string, predecessorId: string) => {
    setModules(prev =>
      prev.map(m => ({
        ...m,
        tasks: m.tasks.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              predecessorTaskIds: (t.predecessorTaskIds || []).filter(id => id !== predecessorId),
            };
          }
          return t;
        }),
      }))
    );

    toast({ title: "Dependency Removed", description: "Task dependency has been removed." });
  };

  const handleSuggestDependencies = async () => {
    if (modules.length === 0 || allTasks.length === 0) {
      toast({ title: "No Tasks", description: "Add tasks first before suggesting dependencies.", variant: "destructive" });
      return;
    }

    setIsSuggestingDeps(true);

    try {
      const result: SuggestDependenciesOutput = await suggestDependencies({
        modules: modules.map(m => ({
          name: m.name,
          tasks: m.tasks.map(t => ({
            id: t.id,
            description: t.description,
            category: t.category,
          })),
        })),
        apiKey: apiKey || undefined,
      });

      // Apply suggestions
      let changedCount = 0;
      setModules(prev =>
        prev.map(m => ({
          ...m,
          tasks: m.tasks.map(t => {
            const suggestion = result.suggestions.find(s => s.taskId === t.id);
            if (suggestion && suggestion.predecessorTaskIds.length > 0) {
              const newPredecessors = [...(t.predecessorTaskIds || []), ...suggestion.predecessorTaskIds].filter(
                (id, index, arr) => arr.indexOf(id) === index
              );
              if (newPredecessors.length > (t.predecessorTaskIds?.length || 0)) {
                changedCount++;
                return { ...t, predecessorTaskIds: newPredecessors };
              }
            }
            return t;
          }),
        }))
      );

      toast({ title: "Dependencies Suggested", description: `AI has suggested ${changedCount} tasks with dependencies.` });
    } catch (error) {
      console.error("Error suggesting dependencies:", error);
      toast({ title: "Error", description: "Failed to suggest dependencies. Please try again.", variant: "destructive" });
    } finally {
      setIsSuggestingDeps(false);
    }
  };

  const getCriticalPathTask = (taskId: string) => {
    return criticalPath.tasks.find(t => t.taskId === taskId);
  };

  const getTaskName = (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    return task ? task.description : taskId;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <GitBranch className="mr-2 h-6 w-6 text-primary" />
          Critical Path & Dependencies
        </CardTitle>
        <CardDescription>
          Manage task dependencies and analyze the critical path for your project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasCycles && (
          <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Circular Dependency Detected</p>
              <p className="text-sm text-destructive/80">Your tasks have circular dependencies. Please review and fix them.</p>
            </div>
          </div>
        )}

        {/* Critical Path Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Project Duration</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatTime(criticalPath.projectDuration)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-orange-700 dark:text-orange-300">Critical Tasks</div>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {criticalPath.criticalPathTaskIds.length} of {allTasks.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestion Button */}
        <Button
          onClick={handleSuggestDependencies}
          disabled={isSuggestingDeps || allTasks.length === 0}
          className="w-full"
          variant="outline"
        >
          {isSuggestingDeps && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSuggestingDeps ? "Analyzing..." : "Suggest Dependencies with AI"}
          <Zap className="ml-2 h-4 w-4" />
        </Button>

        {/* Add Dependency Form */}
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h4 className="font-medium">Add Dependency</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Task</label>
              <Select value={selectedTaskForDep || ""} onValueChange={setSelectedTaskForDep}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {allTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.description.substring(0, 30)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Predecessor</label>
              <Select value={selectedPredecessor || ""} onValueChange={setSelectedPredecessor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select predecessor" />
                </SelectTrigger>
                <SelectContent>
                  {allTasks
                    .filter(t => t.id !== selectedTaskForDep)
                    .map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.description.substring(0, 30)}...
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleAddDependency} className="w-full">
            Add Dependency
          </Button>
        </div>

        {/* Dependencies List */}
        <div className="space-y-4">
          <h4 className="font-medium">Task Dependencies</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {allTasks.map(task => {
              const taskSchedule = getCriticalPathTask(task.id);
              const isOnCriticalPath = taskSchedule?.onCriticalPath || false;

              return (
                <div key={task.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.description}</div>
                      <div className="text-xs text-muted-foreground">{task.moduleName}</div>
                    </div>
                    {isOnCriticalPath && (
                      <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300">Critical</Badge>
                    )}
                  </div>

                  {task.predecessorTaskIds && task.predecessorTaskIds.length > 0 ? (
                    <div className="space-y-1 pt-2 border-t">
                      {task.predecessorTaskIds.map(predId => (
                        <div key={predId} className="flex items-center justify-between gap-2 text-sm bg-muted p-2 rounded">
                          <span className="text-xs">← {getTaskName(predId)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDependency(task.id, predId)}
                            className="h-6 w-6 p-0"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground pt-2">No predecessors</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
