import { config } from 'dotenv';
config();

import '@/ai/flows/augment-tasks.ts';
import '@/ai/flows/generate-project-plan.ts';
import '@/ai/flows/suggest-risks.ts';
