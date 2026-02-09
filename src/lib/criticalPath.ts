import { Decimal } from 'decimal.js';
import type { Module, Task, TaskSchedule, CriticalPathAnalysis } from '@/types';

/**
 * Calculates the critical path for a project using the CPM (Critical Path Method) algorithm.
 * Returns task schedules and identifies the critical path.
 */
export function calculateCriticalPath(modules: Module[]): CriticalPathAnalysis {
  // Flatten all tasks from all modules
  const allTasks = modules.flatMap(m => m.tasks);

  if (allTasks.length === 0) {
    return {
      projectDuration: new Decimal(0),
      tasks: [],
      criticalPathTaskIds: [],
    };
  }

  // Build task lookup map
  const taskMap = new Map<string, Task>();
  allTasks.forEach(task => {
    taskMap.set(task.id, task);
  });

  // Forward pass: Calculate earliest start and finish times
  const earliestTimes = new Map<string, { start: Decimal; finish: Decimal }>();

  const calculateEarliest = (taskId: string): { start: Decimal; finish: Decimal } => {
    if (earliestTimes.has(taskId)) {
      return earliestTimes.get(taskId)!;
    }

    const task = taskMap.get(taskId);
    if (!task) {
      return { start: new Decimal(0), finish: new Decimal(0) };
    }

    let earliestStart = new Decimal(0);

    // Find the latest finish time of all predecessors
    if (task.predecessorTaskIds && task.predecessorTaskIds.length > 0) {
      let maxPredecessorFinish = new Decimal(0);
      for (const predId of task.predecessorTaskIds) {
        const predTimes = calculateEarliest(predId);
        if (predTimes.finish.greaterThan(maxPredecessorFinish)) {
          maxPredecessorFinish = predTimes.finish;
        }
      }
      earliestStart = maxPredecessorFinish;
    }

    const earliestFinish = earliestStart.plus(task.weightedAverageTimeInMinutes);
    earliestTimes.set(taskId, { start: earliestStart, finish: earliestFinish });

    return { start: earliestStart, finish: earliestFinish };
  };

  // Calculate earliest times for all tasks
  allTasks.forEach(task => calculateEarliest(task.id));

  // Find project duration (latest finish time across all tasks)
  let projectDuration = new Decimal(0);
  earliestTimes.forEach(times => {
    if (times.finish.greaterThan(projectDuration)) {
      projectDuration = times.finish;
    }
  });

  // Backward pass: Calculate latest start and finish times
  const latestTimes = new Map<string, { start: Decimal; finish: Decimal }>();

  const calculateLatest = (taskId: string): { start: Decimal; finish: Decimal } => {
    if (latestTimes.has(taskId)) {
      return latestTimes.get(taskId)!;
    }

    const task = taskMap.get(taskId);
    if (!task) {
      return { start: new Decimal(0), finish: new Decimal(0) };
    }

    let latestFinish = projectDuration;

    // Find the earliest start time of all successors
    const successorIds = allTasks
      .filter(t => t.predecessorTaskIds?.includes(taskId))
      .map(t => t.id);

    if (successorIds.length > 0) {
      let minSuccessorStart = projectDuration;
      for (const succId of successorIds) {
        const succTimes = calculateLatest(succId);
        if (succTimes.start.lessThan(minSuccessorStart)) {
          minSuccessorStart = succTimes.start;
        }
      }
      latestFinish = minSuccessorStart;
    }

    const latestStart = latestFinish.minus(task.weightedAverageTimeInMinutes);
    latestTimes.set(taskId, { start: latestStart, finish: latestFinish });

    return { start: latestStart, finish: latestFinish };
  };

  // Calculate latest times for all tasks
  allTasks.forEach(task => calculateLatest(task.id));

  // Build task schedules and identify critical path
  const taskSchedules: TaskSchedule[] = [];
  const criticalPathTaskIds: string[] = [];

  allTasks.forEach(task => {
    const earliest = earliestTimes.get(task.id)!;
    const latest = latestTimes.get(task.id)!;
    const slack = latest.start.minus(earliest.start);
    const onCriticalPath = slack.eq(0);

    if (onCriticalPath) {
      criticalPathTaskIds.push(task.id);
    }

    taskSchedules.push({
      taskId: task.id,
      earliestStart: earliest.start,
      earliestFinish: earliest.finish,
      latestStart: latest.start,
      latestFinish: latest.finish,
      slack,
      onCriticalPath,
    });
  });

  return {
    projectDuration,
    tasks: taskSchedules,
    criticalPathTaskIds,
  };
}

/**
 * Validates if dependencies form a valid DAG (no cycles)
 */
export function hasCyclicDependencies(modules: Module[]): boolean {
  const allTasks = modules.flatMap(m => m.tasks);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (taskId: string): boolean => {
    visited.add(taskId);
    recursionStack.add(taskId);

    const task = allTasks.find(t => t.id === taskId);
    if (task?.predecessorTaskIds) {
      for (const predId of task.predecessorTaskIds) {
        if (!visited.has(predId)) {
          if (hasCycle(predId)) {
            return true;
          }
        } else if (recursionStack.has(predId)) {
          return true;
        }
      }
    }

    recursionStack.delete(taskId);
    return false;
  };

  for (const task of allTasks) {
    if (!visited.has(task.id)) {
      if (hasCycle(task.id)) {
        return true;
      }
    }
  }

  return false;
}
