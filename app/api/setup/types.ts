import { z } from 'zod';
import { setupProgressSchema } from './setupProgressSchema';

export const setupSteps = [
    'welcome',  // Added welcome step
    'admin',
    'settings',
    'oauth',
    'team',
    'complete'
] as const;

export type SetupProgress = z.infer<typeof setupProgressSchema>;