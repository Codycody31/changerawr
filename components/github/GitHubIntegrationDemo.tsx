import React, { useState } from 'react';
import { Github, Settings, BookOpen, TestTube } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GitHubIntegrationSettings from './GitHubIntegrationSettings';
import GitHubGenerateDialog from './GitHubGenerateDialog';

export default function GitHubIntegrationDemo() {
    const [projectId] = useState('demo-project-id');

    const handleChangelogGenerated = (content: string, version?: string) => {
        console.log('Generated changelog:', { content, version });
        // In real implementation, this would populate the changelog entry form
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex justify-center">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Github className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold">GitHub Integration</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Connect your GitHub repository to automatically generate changelog content from commits.
                    No webhooks required - generate on-demand using personal access tokens.
                </p>
            </div>

            {/* Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardContent className="p-4 text-center">
                        <Settings className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <h3 className="font-medium">Easy Configuration</h3>
                        <p className="text-sm text-muted-foreground">
                            Connect with personal access token, no GitHub app needed
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <h3 className="font-medium">Smart Generation</h3>
                        <p className="text-sm text-muted-foreground">
                            AI-powered or template-based changelog generation
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <TestTube className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                        <h3 className="font-medium">Flexible Methods</h3>
                        <p className="text-sm text-muted-foreground">
                            Generate from recent commits, tags, or specific ranges
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Demo Interface */}
            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="settings">Configuration</TabsTrigger>
                    <TabsTrigger value="generate">Generate Changelog</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>GitHub Integration Settings</CardTitle>
                            <CardDescription>
                                Configure your GitHub repository connection and content preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <GitHubIntegrationSettings projectId={projectId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="generate" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Changelog Content</CardTitle>
                            <CardDescription>
                                Generate changelog content from your GitHub repository commits
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <GitHubGenerateDialog
                                    projectId={projectId}
                                    onGenerated={handleChangelogGenerated}
                                />
                            </div>

                            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                                <h4 className="font-medium mb-2">How it works:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                    <li>Configure your GitHub repository and access token</li>
                                    <li>Choose generation method (recent commits, between tags, etc.)</li>
                                    <li>Optionally enable AI enhancement for better content</li>
                                    <li>Review and use the generated changelog content</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Technical Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Implementation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium mb-2">Security Features:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                <li>Access tokens encrypted in database</li>
                                <li>No webhooks or external callbacks required</li>
                                <li>Minimal required GitHub permissions</li>
                                <li>Project-level token isolation</li>
                                <li>Comprehensive audit logging</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Generation Methods:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                <li>Recent commits (last N days)</li>
                                <li>Between tags/releases</li>
                                <li>Between specific commits</li>
                                <li>Conventional commit parsing</li>
                                <li>AI-powered content enhancement</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}