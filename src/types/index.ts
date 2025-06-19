import Decimal from "decimal.js";

export type TimeUnit = 'minutes' | 'hours' | 'days';

export const TASK_CATEGORIES = [
  "Design",
  "Development (Frontend)",
  "Development (Backend)",
  "API Development",
  "Database",
  "Testing/QA",
  "Deployment",
  "Management",
  "Documentation",
  "Research",
  "Communication",
  "Other",
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];


export interface Task {
  id: string;
  description: string;
  optimisticTime: number;
  pessimisticTime: number;
  mostLikelyTime: number;
  timeUnit: TimeUnit;
  weightedAverageTimeInMinutes: Decimal;
  category?: TaskCategory;
}

export interface Module {
  id: string;
  name: string;
  tasks: Task[];
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export const riskLevelToNumber = (level: RiskLevel | undefined): number => {
  if (!level) return 2; // Default to Medium
  switch (level) {
    case 'Low': return 1;
    case 'Medium': return 2;
    case 'High': return 3;
    default: return 2;
  }
};


export interface Risk {
  id: string;
  description: string;
  timeEstimate: number; // Original time impact magnitude
  timeUnit: TimeUnit;   // Unit for timeEstimate
  riskTimeInMinutes: number; // Calculated time impact in minutes
  probability: RiskLevel;
  impactSeverity: RiskLevel;
}

// Represents the core data of a project, used for saving and loading
export interface ProjectData {
  name: string;
  requirementsDocument: string;
  modules: Module[];
  risks: Risk[];
  effortMultiplier: number;
  hourlyRate: number;
  fixedCosts: string; // Stored as string from Decimal
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

// AI Flow Types
export interface SuggestRisksInput {
  projectDescription: string;
}

export interface SuggestRisksOutput {
  suggestedRisks: string[];
}
