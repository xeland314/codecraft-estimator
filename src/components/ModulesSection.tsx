
"use client";

import type * as React from 'react';
import { useState, useEffect } from 'react';
import type { Module, Task, TimeUnit, TaskCategory } from '@/types';
import { TASK_CATEGORIES } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PackagePlus, ListChecks, Trash2, PlusCircle, Brain, Loader2, Edit3, Save, Layers } from 'lucide-react';
import { calculateWeightedAverage, convertToMinutes, formatTime } from '@/lib/timeUtils';
import { augmentTasks, type AugmentTasksOutput } from '@/ai/flows/augment-tasks';
import { useToast } from '@/hooks/use-toast';

interface ModulesSectionProps {
  modules: Module[];
  setModules: React.Dispatch<React.SetStateAction<Module[]>>;
  apiKey: string;
}


export default function ModulesSection({ modules, setModules, apiKey }: ModulesSectionProps) {
  const [newModuleName, setNewModuleName] = useState('');

  const [newTask, setNewTask] = useState<{ [moduleId: string]: Partial<Task> }>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskData, setEditingTaskData] = useState<Partial<Task> | null>(null);

  const [aiTaskPrompt, setAiTaskPrompt] = useState<{ [moduleId: string]: string }>({});
  const [isAugmenting, setIsAugmenting] = useState<{ [moduleId: string]: boolean }>({});
  const { toast } = useToast();

  const handleAddModule = () => {
    if (!newModuleName.trim()) {
      toast({ title: "Module name is empty", description: "Please enter a name for the module.", variant: "destructive" });
      return;
    }
    const newModule: Module = { id: crypto.randomUUID(), name: newModuleName, tasks: [] };
    setModules(prev => [...prev, newModule]);
    setNewModuleName('');
  };

  const handleDeleteModule = (moduleId: string) => {
    setModules(prev => prev.filter(m => m.id !== moduleId));
  };

  const handleTaskInputChange = (moduleId: string, field: keyof Task, value: string | number, unitFieldOrCategory?: boolean) => {
    setNewTask(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [field]: unitFieldOrCategory ? value : (value === '' ? undefined : Number(value))
      }
    }));
  };

  const handleEditingTaskInputChange = (field: keyof Task, value: string | number, unitFieldOrCategory?: boolean) => {
    setEditingTaskData(prev => ({
      ...prev,
      [field]: unitFieldOrCategory ? value : (value === '' ? undefined : Number(value))
    }));
  };

  const handleAddTask = (moduleId: string) => {
    const currentNewTask = newTask[moduleId];
    if (!currentNewTask || !currentNewTask.description?.trim() || currentNewTask.optimisticTime == null || currentNewTask.mostLikelyTime == null || currentNewTask.pessimisticTime == null || !currentNewTask.timeUnit) {
      toast({ title: "Incomplete task details", description: "Please fill all task fields (description, times, unit).", variant: "destructive" });
      return;
    }

    if (currentNewTask.pessimisticTime < currentNewTask.mostLikelyTime || currentNewTask.mostLikelyTime < currentNewTask.optimisticTime) {
      toast({ title: "Invalid time estimates", description: "Pessimistic time must be >= Most Likely time, and Most Likely time must be >= Optimistic time.", variant: "destructive" });
      return;
    }

    const weightedAverageTimeInMinutes = calculateWeightedAverage(
      currentNewTask.optimisticTime,
      currentNewTask.mostLikelyTime,
      currentNewTask.pessimisticTime,
      currentNewTask.timeUnit
    );

    const taskToAdd: Task = {
      id: crypto.randomUUID(),
      description: currentNewTask.description,
      optimisticTime: currentNewTask.optimisticTime,
      mostLikelyTime: currentNewTask.mostLikelyTime,
      pessimisticTime: currentNewTask.pessimisticTime,
      timeUnit: currentNewTask.timeUnit,
      category: currentNewTask.category || undefined,
      status: 'pending',
      weightedAverageTimeInMinutes,
    };

    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, tasks: [...m.tasks, taskToAdd] } : m));
    setNewTask(prev => ({ ...prev, [moduleId]: { category: prev[moduleId]?.category } })); // Preserve category if user set it, clear others
  };

  const handleUpdateTask = (moduleId: string) => {
    if (!editingTaskId || !editingTaskData) return;

    const { description, optimisticTime, mostLikelyTime, pessimisticTime, timeUnit, category } = editingTaskData;

    if (!description?.trim() || optimisticTime == null || mostLikelyTime == null || pessimisticTime == null || !timeUnit) {
      toast({ title: "Incomplete task details", description: "Please fill all task fields for editing.", variant: "destructive" });
      return;
    }
    if (pessimisticTime < mostLikelyTime || mostLikelyTime < optimisticTime) {
      toast({ title: "Invalid time estimates", description: "Pessimistic time must be >= Most Likely time, and Most Likely time must be >= Optimistic time.", variant: "destructive" });
      return;
    }

    const weightedAverageTimeInMinutes = calculateWeightedAverage(optimisticTime, mostLikelyTime, pessimisticTime, timeUnit);
    const updatedTask: Task = {
      id: editingTaskId,
      description,
      optimisticTime,
      pessimisticTime,
      mostLikelyTime,
      timeUnit,
      category: category || undefined,
      weightedAverageTimeInMinutes
    };

    setModules(prev => prev.map(m =>
      m.id === moduleId
        ? { ...m, tasks: m.tasks.map(t => t.id === editingTaskId ? updatedTask : t) }
        : m
    ));
    setEditingTaskId(null);
    setEditingTaskData(null);
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskData({ ...task });
  };


  const handleDeleteTask = (moduleId: string, taskId: string) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, tasks: m.tasks.filter(t => t.id !== taskId) } : m));
  };

  const handleAugmentTasks = async (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const currentAiTaskPrompt = aiTaskPrompt[moduleId];
    if (!currentAiTaskPrompt || !currentAiTaskPrompt.trim()) {
      toast({ title: "AI prompt is empty", description: "Please enter a prompt for task augmentation.", variant: "destructive" });
      return;
    }

    setIsAugmenting(prev => ({ ...prev, [moduleId]: true }));

    const existingTasksString = module.tasks.map(t =>
      `- ${t.description} (${t.category || 'Other'}) | ${t.optimisticTime}-${t.mostLikelyTime}-${t.pessimisticTime} ${t.timeUnit}`
    ).join('\n');

    try {
      const result: AugmentTasksOutput = await augmentTasks({
        moduleDescription: module.name,
        existingTasks: existingTasksString,
        prompt: currentAiTaskPrompt,
        apiKey: apiKey || undefined
      });

      if (result.augmentedTasks.length === 0) {
        toast({ title: "No Tasks Generated", description: "AI did not suggest new tasks or adjustments." });
      } else {
        const newTasks: Task[] = result.augmentedTasks.map(data => {
          const weightedAverageTimeInMinutes = calculateWeightedAverage(
            data.optimisticTime, data.mostLikelyTime, data.pessimisticTime, 'hours'
          );
          return {
            id: crypto.randomUUID(),
            description: data.description,
            optimisticTime: data.optimisticTime,
            mostLikelyTime: data.mostLikelyTime,
            pessimisticTime: data.pessimisticTime,
            timeUnit: 'hours' as TimeUnit,
            category: data.category,
            status: 'pending' as const,
            weightedAverageTimeInMinutes,
          };
        });

        setModules(prev => prev.map(m => m.id === moduleId ? { ...m, tasks: [...newTasks] } : m));
        toast({ title: "Tasks Augmented", description: "Tasks have been updated by AI with categories assigned automatically." });
        setAiTaskPrompt(prev => ({ ...prev, [moduleId]: '' }));
      }

    } catch (error) {
      console.error("Error augmenting tasks:", error);
      toast({ title: "AI Error", description: "Failed to augment tasks. Please try again.", variant: "destructive" });
    } finally {
      setIsAugmenting(prev => ({ ...prev, [moduleId]: false }));
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <PackagePlus className="mr-2 h-6 w-6 text-primary" />
          Module & Task Management
        </CardTitle>
        <CardDescription>
          Organize your project into modules and define tasks with time estimates and categories.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2 items-end">
          <div className="flex-grow">
            <label htmlFor="new-module-name" className="block text-sm font-medium text-foreground">New Module Name</label>
            <Input
              id="new-module-name"
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              placeholder="e.g., User Authentication"
              className="focus:ring-accent"
            />
          </div>
          <Button onClick={handleAddModule} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Module
          </Button>
        </div>

        {modules.length === 0 && <p className="text-muted-foreground text-center py-4">No modules added yet. Start by creating a new module.</p>}

        <Accordion type="multiple" className="w-full space-y-2">
          {modules.map((module) => (
            <AccordionItem value={module.id} key={module.id} className="bg-card border border-border rounded-lg shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:bg-secondary/50 rounded-t-lg">
                <div className="flex justify-between items-center w-full">
                  <span className="font-headline text-lg text-primary">{module.name}</span>
                  <Button asChild variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteModule(module.id); }} className="text-destructive hover:bg-destructive/10">
                    <div><Trash2 className="h-4 w-4" /></div>
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 border-t border-border space-y-4">
                {/* Add Task Form */}
                <Card className="bg-secondary/30">
                  <CardHeader>
                    <CardTitle className="text-md font-headline flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary/80" />Add New Task</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
                    <Textarea
                      placeholder="Task description"
                      value={newTask[module.id]?.description || ''}
                      onChange={(e) => handleTaskInputChange(module.id, 'description', e.target.value, true)}
                      className="md:col-span-3 lg:col-span-2 min-h-[40px] focus:ring-accent"
                    />
                    <Input type="number" placeholder="Optimistic" value={newTask[module.id]?.optimisticTime || ''} onChange={(e) => handleTaskInputChange(module.id, 'optimisticTime', e.target.value)} className="focus:ring-accent" min="0" />
                    <Input type="number" placeholder="Most Likely" value={newTask[module.id]?.mostLikelyTime || ''} onChange={(e) => handleTaskInputChange(module.id, 'mostLikelyTime', e.target.value)} className="focus:ring-accent" min="0" />
                    <Input type="number" placeholder="Pessimistic" value={newTask[module.id]?.pessimisticTime || ''} onChange={(e) => handleTaskInputChange(module.id, 'pessimisticTime', e.target.value)} className="focus:ring-accent" min="0" />
                    <Select onValueChange={(val) => handleTaskInputChange(module.id, 'timeUnit', val, true)} value={newTask[module.id]?.timeUnit || ''}>
                      <SelectTrigger className="focus:ring-accent"><SelectValue placeholder="Unit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex flex-col space-y-1">
                      <Select onValueChange={(val) => handleTaskInputChange(module.id, 'category', val, true)} value={newTask[module.id]?.category || ''}>
                        <SelectTrigger className="focus:ring-accent"><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>
                          {TASK_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => handleAddTask(module.id)} size="sm" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        <PlusCircle className="mr-1 h-4 w-4" /> Add Task
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks List */}
                {module.tasks.length > 0 ? (
                  <ul className="space-y-2">
                    {module.tasks.map(task => (
                      <li key={task.id} className="p-3 border border-border rounded-md bg-background shadow-sm flex flex-col space-y-2">
                        {editingTaskId === task.id ? (
                          // Editing view
                          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-2 items-center">
                            <Textarea value={editingTaskData?.description || ''} onChange={(e) => handleEditingTaskInputChange('description', e.target.value, true)} className="md:col-span-3 lg:col-span-2 min-h-[40px] focus:ring-accent" />
                            <Input type="number" value={editingTaskData?.optimisticTime || ''} onChange={(e) => handleEditingTaskInputChange('optimisticTime', e.target.value)} className="focus:ring-accent" min="0" />
                            <Input type="number" value={editingTaskData?.mostLikelyTime || ''} onChange={(e) => handleEditingTaskInputChange('mostLikelyTime', e.target.value)} className="focus:ring-accent" min="0" />
                            <Input type="number" value={editingTaskData?.pessimisticTime || ''} onChange={(e) => handleEditingTaskInputChange('pessimisticTime', e.target.value)} className="focus:ring-accent" min="0" />
                            <Select onValueChange={(val) => handleEditingTaskInputChange('timeUnit', val, true)} value={editingTaskData?.timeUnit || ''}>
                              <SelectTrigger className="focus:ring-accent"><SelectValue placeholder="Unit" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select onValueChange={(val) => handleEditingTaskInputChange('category', val, true)} value={editingTaskData?.category || ''}>
                              <SelectTrigger className="focus:ring-accent"><SelectValue placeholder="Category" /></SelectTrigger>
                              <SelectContent>
                                {TASK_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-1">
                              <Button onClick={() => handleUpdateTask(module.id)} size="icon" variant="ghost" className="text-green-600 hover:bg-green-600/10"><Save className="h-4 w-4" /></Button>
                              <Button onClick={() => { setEditingTaskId(null); setEditingTaskData(null); }} size="icon" variant="ghost" className="text-muted-foreground hover:bg-muted-foreground/10"><Trash2 className="h-4 w-4" /> Cancel</Button> {/* Adjusted icon and text */}
                            </div>
                          </div>
                        ) : (
                          // Display view
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-foreground">{task.description}</p>
                              <p className="text-xs text-muted-foreground">
                                Opt: {task.optimisticTime} {task.timeUnit}, ML: {task.mostLikelyTime} {task.timeUnit}, Pess: {task.pessimisticTime} {task.timeUnit}
                                {task.category && ` | Cat: ${task.category}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">{formatTime(task.weightedAverageTimeInMinutes)}</p>
                              <div className="flex gap-1 mt-1">
                                <Button onClick={() => startEditingTask(task)} size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-600/10"><Edit3 className="h-4 w-4" /></Button>
                                <Button onClick={() => handleDeleteTask(module.id, task.id)} size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">No tasks added to this module yet.</p>
                )}

                {/* AI Task Augmentation */}
                <Card className="mt-4 bg-secondary/30">
                  <CardHeader>
                    <CardTitle className="text-md font-headline flex items-center"><Brain className="mr-2 h-5 w-5 text-primary/80" />AI Task Augmentation</CardTitle>
                    <CardDescription className="text-xs">Let AI suggest additional tasks or refine estimates for this module. AI will replace existing tasks with its suggestions. Categories will need to be assigned manually after augmentation.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Textarea
                      placeholder="e.g., Add tasks for user profile management and two-factor authentication."
                      value={aiTaskPrompt[module.id] || ''}
                      onChange={(e) => setAiTaskPrompt(prev => ({ ...prev, [module.id]: e.target.value }))}
                      className="min-h-[60px] focus:ring-accent"
                    />
                    <Button
                      onClick={() => handleAugmentTasks(module.id)}
                      disabled={isAugmenting[module.id]}
                      className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {isAugmenting[module.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                      Augment Tasks with AI
                    </Button>
                  </CardContent>
                </Card>

              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
