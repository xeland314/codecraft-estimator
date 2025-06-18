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

// Represents the core data of a project, used for saving and loading
export interface ProjectData {
  requirementsDocument: string;
  modules: Module[];
  risks: Risk[];
  effortMultiplier: number;
  hourlyRate: number;
  // Summary fields can be stored to avoid recalculation on load, or recalculated.
  // Storing them makes loading faster and preserves the exact state at save time.
  totalBaseTimeInMinutes: string; // Stored as string from Decimal
  totalAdjustedTimeInMinutes: string; // Stored as string from Decimal
  totalProjectCost: string; // Stored as string from Decimal
}

// Represents a saved project with metadata
export interface Project extends ProjectData {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
