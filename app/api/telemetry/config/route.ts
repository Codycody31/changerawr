// app/api/telemetry/config/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {TelemetryService} from '@/lib/services/telemetry/service';

export async function GET() {
    try {
        const config = await TelemetryService.getTelemetryConfig();
        return NextResponse.json(config);
    } catch (error) {
        console.error('Failed to get telemetry config:', error);
        return NextResponse.json(
            {error: 'Failed to get telemetry configuration'},
            {status: 500}
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {allowTelemetry} = body;

        if (!['enabled', 'disabled'].includes(allowTelemetry)) {
            return NextResponse.json(
                {error: 'Invalid telemetry state'},
                {status: 400}
            );
        }

        const currentConfig = await TelemetryService.getTelemetryConfig();
        const updatedConfig = {...currentConfig, allowTelemetry};

        // Handle different telemetry state transitions
        if (allowTelemetry === 'enabled') {
            if (!currentConfig.instanceId) {
                // First time enabling - register new instance
                console.log('First time enabling telemetry - registering new instance...');
                const instanceId = await TelemetryService.registerInstance();
                updatedConfig.instanceId = instanceId;
            } else if (currentConfig.allowTelemetry === 'disabled') {
                // Re-enabling - reactivate existing instance
                console.log('Re-enabling telemetry - reactivating instance:', currentConfig.instanceId);
                try {
                    await TelemetryService.reactivateInstance(currentConfig.instanceId);
                } catch (error) {
                    console.warn('Failed to reactivate instance:', error);
                }
            }
            // If already enabled, no action needed
        } else if (allowTelemetry === 'disabled' && currentConfig.instanceId) {
            // Disabling - deactivate instance
            console.log('Disabling telemetry - deactivating instance:', currentConfig.instanceId);
            try {
                await TelemetryService.deactivateInstance(currentConfig.instanceId);
            } catch (error) {
                console.error('Failed to deactivate instance:', error);
            }
        }

        console.log('Updating telemetry config:', updatedConfig);
        await TelemetryService.updateTelemetryConfig(updatedConfig);

        return NextResponse.json({
            success: true,
            config: updatedConfig
        });
    } catch (error) {
        console.error('Failed to update telemetry config:', error);
        return NextResponse.json(
            {
                error: 'Failed to update telemetry configuration',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            {status: 500}
        );
    }
}