export type TimeUnit = 'minutes' | 'hours' | 'days';

export interface Task {
  id: string;
  description: string;
  optimisticTime: number;
  pessimisticTime: number;
  mostLikelyTime: number;
  timeUnit: TimeUnit;
  weightedAverageTimeInMinutes: number; 
}

export interface Module {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Risk {
  id: string;
  description: string;
  timeEstimate: number;
  timeUnit: TimeUnit;
  riskTimeInMinutes: number;
}
