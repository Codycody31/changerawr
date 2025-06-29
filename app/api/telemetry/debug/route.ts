import {NextRequest, NextResponse} from 'next/server';
import {TelemetryService} from '@/lib/services/telemetry/service';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';

export async function GET() {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                {error: 'Admin access required'},
                {status: 403}
            );
        }

        // Test telemetry connection
        try {
            await TelemetryService.testConnection();
            return NextResponse.json({
                success: true,
                message: 'Telemetry connection test successful'
            });
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                details: 'Check server logs for more information'
            });
        }
    } catch (error) {
        console.error('Debug API error:', error);
        return NextResponse.json(
            {error: 'Debug test failed'},
            {status: 500}
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await validateAuthAndGetUser();

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                {error: 'Admin access required'},
                {status: 403}
            );
        }

        const body = await request.json();
        const {action} = body;

        switch (action) {
            case 'test_connection':
                try {
                    await TelemetryService.testConnection();
                    return NextResponse.json({
                        success: true,
                        message: 'Connection test successful'
                    });
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }

            case 'get_config':
                const config = await TelemetryService.getTelemetryConfig();
                return NextResponse.json({
                    success: true,
                    config
                });

            case 'force_register':
                try {
                    const instanceId = await TelemetryService.registerInstance();
                    return NextResponse.json({
                        success: true,
                        instanceId,
                        message: 'Instance registered successfully'
                    });
                } catch (error) {
                    return NextResponse.json({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }

            default:
                return NextResponse.json(
                    {error: 'Invalid action'},
                    {status: 400}
                );
        }
    } catch (error) {
        console.error('Debug API error:', error);
        return NextResponse.json(
            {error: 'Debug action failed'},
            {status: 500}
        );
    }
}