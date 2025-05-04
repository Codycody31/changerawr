import { z } from 'zod';
import { setupProgressSchema } from './setupProgressSchema';

export const setupSteps = [
    'admin',
    'settings',
    'oauth',
    'complete'
] as const;

export type SetupProgress = z.infer<typeof setupProgressSchema>;
