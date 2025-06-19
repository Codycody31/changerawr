// app/api/setup/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SetupProgress } from '@/app/api/setup/types';

/**
 * @method GET
 * @description Get current setup progress including team invitations
 */
export async function GET() {
    try {
        // Check database state to determine progress
        const userCount = await db.user.count();
        const systemConfig = await db.systemConfig.findFirst();
        const oauthProviders = await db.oAuthProvider.count();

        // Check if any invitations have been created (indicates team step completion attempt)
        const invitationCount = await db.invitationLink.count();

        const progress: SetupProgress = {
            currentStep: userCount > 0 ? 'settings' : 'admin',
            completedSteps: [],
            adminCreated: userCount > 0,
            settingsConfigured: !!systemConfig,
            oauthConfigured: oauthProviders > 0,
            teamInvitesSent: invitationCount > 0,
            isComplete: userCount > 0 && !!systemConfig
        };

        // Determine completed steps
        if (progress.adminCreated) {
            progress.completedSteps.push('admin');
        }

        if (progress.settingsConfigured) {
            progress.completedSteps.push('settings');
        }

        if (progress.oauthConfigured) {
            progress.completedSteps.push('oauth');
        }

        if (progress.teamInvitesSent) {
            progress.completedSteps.push('team');
        }

        // Determine current step
        if (!progress.adminCreated) {
            progress.currentStep = 'admin';
        } else if (!progress.settingsConfigured) {
            progress.currentStep = 'settings';
        } else if (!progress.oauthConfigured) {
            progress.currentStep = 'oauth';
        } else if (!progress.teamInvitesSent) {
            progress.currentStep = 'team';
        } else {
            progress.currentStep = 'complete';
            progress.completedSteps.push('complete');
            progress.isComplete = true;
        }

        return NextResponse.json(progress);
    } catch (error) {
        console.error('Error getting setup progress:', error);
        return NextResponse.json(
            { error: 'Failed to get setup progress' },
            { status: 500 }
        );
    }
}