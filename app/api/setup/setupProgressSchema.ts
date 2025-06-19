// Schema for tracking setup progress
import {z} from "zod";

export const setupProgressSchema = z.object({
    currentStep: z.string(),
    completedSteps: z.array(z.string()),
    adminCreated: z.boolean().default(false),
    settingsConfigured: z.boolean().default(false),
    oauthConfigured: z.boolean().optional(),
    teamInvitesSent: z.boolean().default(false),
    isComplete: z.boolean().default(false)
});