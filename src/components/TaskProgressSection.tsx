"use client";

import type React from 'react';
import { useMemo } from 'react';
import type { Module, TaskStatus } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatTime } from '@/lib/timeUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TaskProgressSectionProps {
  readonly modules: Module[];
  readonly setModules: (modules: Module[]) => void;
}

export default function TaskProgressSection({ modules, setModules }: TaskProgressSectionProps) {
  const progressStats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let completedTime = new Decimal(0);
    let inProgressTime = new Decimal(0);
    let pendingTime = new Decimal(0);

    const moduleStats = modules.map(module => {
      let moduleTotalTasks = 0;
      let moduleCompletedTasks = 0;
      let moduleInProgressTasks = 0;
      let modulePendingTasks = 0;
      let moduleCompletedTime = new Decimal(0);
      let moduleInProgressTime = new Decimal(0);
      let modulePendingTime = new Decimal(0);

      module.tasks.forEach(task => {
        moduleTotalTasks++;
        totalTasks++;

        if (task.status === 'completed') {
          moduleCompletedTasks++;
          completedTasks++;
          moduleCompletedTime = moduleCompletedTime.plus(task.weightedAverageTimeInMinutes);
          completedTime = completedTime.plus(task.weightedAverageTimeInMinutes);
        } else if (task.status === 'in-progress') {
          moduleInProgressTasks++;
          inProgressTasks++;
          moduleInProgressTime = moduleInProgressTime.plus(task.weightedAverageTimeInMinutes);
          inProgressTime = inProgressTime.plus(task.weightedAverageTimeInMinutes);
        } else {
          modulePendingTasks++;
          modulePendingTime = modulePendingTime.plus(task.weightedAverageTimeInMinutes);
          pendingTime = pendingTime.plus(task.weightedAverageTimeInMinutes);
        }
      });

      return {
        moduleId: module.id,
        moduleName: module.name,
        totalTasks: moduleTotalTasks,
        completed: moduleCompletedTasks,
        inProgress: moduleInProgressTasks,
        pending: modulePendingTasks,
        completedTime: moduleCompletedTime,
        inProgressTime: moduleInProgressTime,
        pendingTime: modulePendingTime,
        completionPercentage: moduleTotalTasks > 0 ? Math.round((moduleCompletedTasks / moduleTotalTasks) * 100) : 0,
      };
    });

    const projectCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks: totalTasks - completedTasks - inProgressTasks,
      completedTime,
      inProgressTime,
      pendingTime,
      projectCompletionPercentage,
      moduleStats,
    };
  }, [modules]);

  const handleToggleTaskStatus = (moduleId: string, taskId: string) => {
    setModules(
      modules.map(m => {
        if (m.id === moduleId) {
          return {
            ...m,
            tasks: m.tasks.map(t => {
              if (t.id === taskId) {
                const currentStatus = t.status;
                let newStatus: TaskStatus;
                if (currentStatus === 'pending') {
                  newStatus = 'in-progress';
                } else if (currentStatus === 'in-progress') {
                  newStatus = 'completed';
                } else {
                  newStatus = 'pending';
                }
                return { ...t, status: newStatus };
              }
              return t;
            })
          };
        }
        return m;
      })
    );
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in-progress':
        return 'secondary';
      case 'pending':
        return 'outline';
    }
  };

  if (modules.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <AlertCircle className="mr-2 h-6 w-6 text-primary" />
            Task Progress Tracking
          </CardTitle>
          <CardDescription>Track the completion status of your project tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No modules or tasks available. Create modules and tasks first to start tracking progress.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Project Completion Overview</CardTitle>
          <CardDescription>Overall project progress and task distribution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{progressStats.projectCompletionPercentage}% Complete</span>
              <span className="text-sm text-muted-foreground">
                {progressStats.completedTasks} of {progressStats.totalTasks} tasks
              </span>
            </div>
            <Progress value={progressStats.projectCompletionPercentage} className="h-3" />
          </div>

          {/* Time Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{progressStats.completedTasks}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatTime(progressStats.completedTime)}
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">In Progress</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{progressStats.inProgressTasks}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatTime(progressStats.inProgressTime)}
              </p>
            </div>

            <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Circle className="h-5 w-5 text-gray-500" />
                <span className="font-semibold">Pending</span>
              </div>
              <p className="text-2xl font-bold text-gray-600">{progressStats.pendingTasks}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatTime(progressStats.pendingTime)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Progress */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Progress by Module</CardTitle>
          <CardDescription>View and manage task completion status for each module.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={modules[0]?.id} className="w-full">
            <TabsList className="h-full w-full flex flex-wrap gap-2 overflow-x-auto py-1">
              {progressStats.moduleStats.map(stat => (
                <TabsTrigger
                  key={stat.moduleId}
                  value={stat.moduleId}
                  className="text-xs sm:text-sm flex-none min-w-[120px] max-w-[220px]"
                >
                  <div className="text-center min-w-0">
                    <div className="font-semibold">{stat.completionPercentage}%</div>
                    <div className="text-xs text-muted-foreground truncate">{stat.moduleName}</div>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {progressStats.moduleStats.map(moduleStat => (
              <TabsContent key={moduleStat.moduleId} value={moduleStat.moduleId} className="space-y-4 mt-4">
                {/* Module Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2 min-w-0">
                    <h3 className="font-semibold truncate mr-2">{moduleStat.moduleName}</h3>
                    <span className="text-sm text-muted-foreground">
                      {moduleStat.completed}/{moduleStat.totalTasks}
                    </span>
                  </div>
                  <Progress value={moduleStat.completionPercentage} className="h-2" />
                </div>

                {/* Module Statistics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted p-2 rounded text-center">
                    <div className="text-xs text-muted-foreground">Completed</div>
                    <div className="font-bold text-sm text-green-600">{moduleStat.completed}</div>
                  </div>
                  <div className="bg-muted p-2 rounded text-center">
                    <div className="text-xs text-muted-foreground">In Progress</div>
                    <div className="font-bold text-sm text-blue-600">{moduleStat.inProgress}</div>
                  </div>
                  <div className="bg-muted p-2 rounded text-center">
                    <div className="text-xs text-muted-foreground">Pending</div>
                    <div className="font-bold text-sm text-gray-600">{moduleStat.pending}</div>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {modules.find(m => m.id === moduleStat.moduleId)?.tasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleTaskStatus(moduleStat.moduleId, task.id)}
                          className="mt-0.5 hover:scale-110 transition-transform"
                          title="Click to change status"
                        >
                          {getStatusIcon(task.status)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm break-words">{task.description}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {task.category && (
                              <Badge variant="outline" className="text-xs">{task.category}</Badge>
                            )}
                            <Badge
                              variant={getStatusBadgeVariant(task.status)}
                              className="text-xs capitalize"
                            >
                              {task.status.replace('-', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(task.weightedAverageTimeInMinutes)}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Time Summary */}
      {progressStats.completedTime.gt(0) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Time Tracking Summary</CardTitle>
            <CardDescription>Total time allocation by completion status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Completed Tasks Time:</span>
                <span className="font-semibold text-green-600">{formatTime(progressStats.completedTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">In-Progress Tasks Time:</span>
                <span className="font-semibold text-blue-600">{formatTime(progressStats.inProgressTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending Tasks Time:</span>
                <span className="font-semibold text-gray-600">{formatTime(progressStats.pendingTime)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center font-bold">
                <span>Total Estimated Time:</span>
                <span>{formatTime(progressStats.completedTime.plus(progressStats.inProgressTime).plus(progressStats.pendingTime))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
