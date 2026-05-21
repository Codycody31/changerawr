'use client';

import { useEffect, useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

interface BuilderServiceHealth {
  status: string;
  version: string;
  uptime: number;
  activeJobs: number;
}

export function BuilderServiceStatus() {
  const [health, setHealth] = useState<BuilderServiceHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('http://localhost:3010/health');

        if (!response.ok) {
          throw new Error('Builder service not responding');
        }

        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (e: any) {
        setError(e.message || 'Builder service offline');
        setHealth(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 border rounded bg-card">
      <h3 className="font-semibold mb-3">Builder Service Status</h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking...</span>
        </div>
      ) : error ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600">
            <X className="h-4 w-4" />
            <span className="font-medium">Offline</span>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Start the builder service:
            <code className="block mt-1 bg-muted p-2 rounded">
              cd extension-builder && npm install && npm run dev
            </code>
          </p>
        </div>
      ) : health ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-4 w-4" />
            <span className="font-medium">Online</span>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">{health.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-mono">{Math.floor(health.uptime)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Jobs</span>
              <span className="font-mono">{health.activeJobs}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
