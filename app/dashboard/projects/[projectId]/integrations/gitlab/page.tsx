'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Gitlab, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GitLabIntegrationSettings from '@/components/gitlab/GitLabIntegrationSettings';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import GitLabGenerateDialog from '@/components/gitlab/GitLabGenerateDialog';

export default function GitLabIntegrationPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    if (!projectId) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const handleGenerated = (content: string, version?: string) => {
        const encoded = btoa(unescape(encodeURIComponent(content)));
        const search = new URLSearchParams({ content: encoded, ...(version && { version }) });
        router.push(`/dashboard/projects/${projectId}/changelog/new?${search}`);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                    <div className="p-2 bg-primary/10 rounded-lg"><Gitlab className="h-6 w-6 text-primary" /></div>
                    <h1 className="text-2xl font-bold">GitLab Integration</h1>
                </div>
                <GitLabGenerateDialog projectId={projectId} onGenerated={handleGenerated} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Repository Configuration</CardTitle>
                    <CardDescription>Configure your GitLab repository connection and content preferences</CardDescription>
                </CardHeader>
                <CardContent>
                    <GitLabIntegrationSettings projectId={projectId} />
                </CardContent>
            </Card>
        </div>
    );
} 