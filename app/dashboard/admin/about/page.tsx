'use client'

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { appInfo, getCopyrightYears } from '@/lib/app-info';
import { Heart } from 'lucide-react';
import UpdateStatus from '@/components/UpdateStatus';

export default function AboutPage() {
    const [databaseInfo, setDatabaseInfo] = useState<{ databaseVersion?: string }>({});

    // Function to check for updates by fetching from server
    const checkForUpdates = async () => {
        try {
            const response = await fetch('https://dl.supers0ft.us/changerawr/');
            if (!response.ok) {
                throw new Error('Failed to fetch version');
            }
            const data = await response.json();

            // Assuming the PHP script returns { version: "1.0.0" }
            return data.version || appInfo.version;
        } catch (error) {
            console.error('Error checking for updates:', error);
            // Return current version if request fails
            return appInfo.version;
        }
    }

    // Mock function to simulate updating the app
    const updateApp = async () => {
        return new Promise<void>((resolve) => {
            // Simulate update process
            setTimeout(() => {
                resolve()
                // In a real app, you might trigger a page reload or show a success message
                // window.location.reload()
            }, 2000)
        })
    }

    useEffect(() => {
        async function fetchDatabaseInfo() {
            try {
                const response = await fetch('/api/system/version');
                const data = await response.json();
                setDatabaseInfo(data);
            } catch (error) {
                console.error('Failed to fetch database info:', error);
            }
        }
        fetchDatabaseInfo();
    }, []);

    return (
        <div className="max-w-lg mx-auto space-y-6 py-6">
            <Card className="border-2 overflow-hidden">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center bg-primary/10">
                            <span className="text-4xl font-bold">🦖</span>
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold">Changerawr</CardTitle>
                    <CardDescription>Ship, Release, Rawr 🦖</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <div className="flex justify-center gap-2 mb-4">
                        <Badge variant="outline" className="px-3 py-1">v{appInfo.version}</Badge>
                        <Badge variant="secondary" className="px-3 py-1">{appInfo.status}</Badge>
                    </div>

                    {/* Update Status Component */}
                    <div className="pt-2">
                        <UpdateStatus
                            currentVersion={appInfo.version}
                            onCheckUpdate={checkForUpdates}
                            onUpdate={updateApp}
                            checkOnMount={true}
                            autoCheckInterval={60 * 60 * 1000} // Check every hour
                        />
                    </div>

                    <div className="max-w-xs mx-auto mt-4">
                        <p className="text-sm text-muted-foreground">
                            Making changelog management cute and simple since 2025!
                            Keep your users updated with adorable, organized release notes. ✨
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col items-center pt-2 pb-6">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> by <a href="https://superdev.one" className="hover:underline">Supernova3339</a>
                    </p>
                    <p className="text-xs text-muted-foreground">© {getCopyrightYears()} {appInfo.name} • All rights reserved</p>
                </CardFooter>
            </Card>

            {/* System Information */}
            <Card className="border overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg font-medium">🛠️ System Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-border/40"><span>Application</span><span>{appInfo.name}</span></div>
                        <div className="flex justify-between py-1 border-b border-border/40"><span>Version</span><span>{appInfo.version} ({appInfo.status})</span></div>
                        <div className="flex justify-between py-1 border-b border-border/40"><span>Framework</span><span>{appInfo.framework}</span></div>
                        <div className="flex justify-between py-1 border-b border-border/40"><span>Database</span><span>PostgreSQL&nbsp;{databaseInfo?.databaseVersion || 'Unknown'}</span></div>
                        <div className="flex justify-between py-1 border-b border-border/40"><span>Environment</span><span>{appInfo.environment}</span></div>
                        <div className="flex justify-between py-1"><span>Released</span><span>{new Date(appInfo.releaseDate).toLocaleDateString()}</span></div>
                    </div>
                </CardContent>
            </Card>

            {/* Easter egg */}
            <div className="text-center text-xs text-muted-foreground pt-2">
                <span className="cursor-default hover:text-primary transition-colors">rawr~ ʕ•ᴥ•ʔ</span>
            </div>
        </div>
    );
}