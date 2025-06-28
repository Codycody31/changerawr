import {TelemetryState} from '@/lib/types/telemetry';
import {useState, useEffect, useCallback} from 'react';

interface TelemetryConfig {
    allowTelemetry: TelemetryState;
    instanceId?: string;
}

export const useTelemetry = (enabled: boolean = true) => {
    const [config, setConfig] = useState<TelemetryConfig | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!enabled) {
            setIsLoading(false);
            return;
        }

        const loadConfig = async () => {
            try {
                // Use fetch to call our API endpoint instead of direct database access
                const response = await fetch('/api/telemetry/config');
                if (response.ok) {
                    const currentConfig = await response.json();
                    setConfig(currentConfig);

                    if (currentConfig.allowTelemetry === 'prompt') {
                        setShowPrompt(true);
                    }
                } else {
                    // If API fails, default to prompt state
                    setConfig({ allowTelemetry: 'prompt' });
                    setShowPrompt(true);
                }
            } catch (error) {
                console.error('Failed to load telemetry config:', error);
                // Default to prompt state on error
                setConfig({ allowTelemetry: 'prompt' });
                setShowPrompt(true);
            } finally {
                setIsLoading(false);
            }
        };

        loadConfig();
    }, [enabled]);

    const handleTelemetryChoice = useCallback(
        async (choice: Extract<TelemetryState, 'enabled' | 'disabled'>) => {
            if (!enabled || !config) return;

            try {
                const response = await fetch('/api/telemetry/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ allowTelemetry: choice }),
                });

                if (response.ok) {
                    const updatedConfig = await response.json();
                    setConfig(updatedConfig);
                    setShowPrompt(false);
                } else {
                    console.error('Failed to update telemetry config');
                }
            } catch (error) {
                console.error('Failed to update telemetry config:', error);
            }
        },
        [enabled, config]
    );

    return {
        config,
        showPrompt: enabled ? showPrompt : false,
        isLoading,
        handleTelemetryChoice,
    };
};