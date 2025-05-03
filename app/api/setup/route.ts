import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SetupProgress } from '@/app/api/setup/types';

/**
 * @method GET
 * @description Get current setup progress
 */
export async function GET() {
    try {
        // Check database state to determine progress
        const userCount = await db.user.count();
        const systemConfig = await db.systemConfig.findFirst();
        const oauthProviders = await db.oAuthProvider.count();

        const progress: SetupProgress = {
            currentStep: userCount > 0 ? 'settings' : 'admin',
            completedSteps: [],
            adminCreated: userCount > 0,
            settingsConfigured: !!systemConfig,
            oauthConfigured: oauthProviders > 0,
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

        if (progress.isComplete) {
            progress.completedSteps.push('complete');
            progress.currentStep = 'complete';
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