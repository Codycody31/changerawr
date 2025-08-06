// app/dashboard/projects/[projectId]/import/page.tsx

'use client';

import {use, useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {motion} from 'framer-motion';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
    CheckCircle,
    Clock,
    FileText,
    Upload,
} from 'lucide-react';

import {
    Avatar,
    AvatarFallback
} from '@/components/ui/avatar';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {useToast} from '@/hooks/use-toast';

import {ChangelogImportModal} from '@/components/projects/importing/ChangelogImportModal';
import {ImportResult} from '@/lib/types/projects/importing';

interface Project {
    id: string;
    name: string;
    isPublic: boolean;
    changelog?: {
        id: string;
        entries: Array<{
            id: string;
            title: string;
            version?: string;
            publishedAt?: string;
            createdAt: string;
        }>;
    };
    createdAt: string;
    updatedAt: string;
}

interface ImportPageProps {
    params: Promise<{ projectId: string }>;
}

const fadeIn = {
    initial: {opacity: 0, y: 20},
    animate: {opacity: 1, y: 0},
    transition: {duration: 0.5}
};

export default function ImportPage({params}: ImportPageProps) {
    const {projectId} = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const {toast} = useToast();
    const [showImportModal, setShowImportModal] = useState(false);

    // Fetch project data
    const {data: project, isLoading: isLoadingProject} = useQuery<Project>({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/projects/${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch project');
            return response.json();
        }
    });

    const handleImportComplete = (result: ImportResult) => {
        setShowImportModal(false);

        toast({
            title: 'Import completed!',
            description: `Successfully imported ${result.importedCount} entries.`,
        });

        // Refresh project data and redirect to changelog
        queryClient.invalidateQueries({queryKey: ['project', projectId]});
        router.push(`/dashboard/projects/${projectId}/changelog`);
    };

    if (isLoadingProject) {
        return (
            <div className="container max-w-4xl space-y-6 p-4 md:p-8">
                <div className="space-y-4">
                    <div className="h-16 bg-muted rounded-lg animate-pulse"/>
                    <div className="h-64 bg-muted rounded-lg animate-pulse"/>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container max-w-4xl">
                <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
                    <h2 className="text-2xl font-semibold mb-2">Project Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
                    </p>
                    <Button asChild>
                        <Link href="/dashboard/projects">Back to Projects</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const currentEntryCount = project.changelog?.entries.length || 0;
    const publishedCount = project.changelog?.entries.filter(e => e.publishedAt).length || 0;
    const draftCount = currentEntryCount - publishedCount;

    return (
        <>
            <div className="container items-center justify-center space-y-8 p-4 md:p-8 min-h-[calc(100vh-4rem)]">
                {/* Project Header */}
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                    className="flex items-center gap-4"
                >
                    <Avatar className="h-12 w-12 rounded-xl">
                        <AvatarFallback className="rounded-xl text-lg">
                            {project.name.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        <p className="text-muted-foreground">Import changelog data</p>
                    </div>
                </motion.div>

                {/* Current Stats */}
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                    className="grid gap-4 md:grid-cols-3"
                >
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Current Entries</p>
                                    <p className="text-2xl font-bold">{currentEntryCount}</p>
                                </div>
                                <FileText className="h-8 w-8 text-blue-600"/>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Published</p>
                                    <p className="text-2xl font-bold">{publishedCount}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-600"/>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                                    <p className="text-2xl font-bold">{draftCount}</p>
                                </div>
                                <Clock className="h-8 w-8 text-yellow-600"/>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Main Import Card */}
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={fadeIn}
                >
                    <Card className="border-dashed border-2">
                        <CardHeader className="text-center">
                            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
                                <Upload className="h-8 w-8 text-primary"/>
                            </div>
                            <CardTitle className="text-xl">Import Changelog Data</CardTitle>
                            <CardDescription>
                                Upload your existing changelog files or paste markdown content to add more entries
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* Supported Formats */}
                            <div className="text-center space-y-3">
                                <p className="font-medium text-sm">Supported Formats</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Badge variant="secondary">Keep a Changelog</Badge>
                                    <Badge variant="secondary">GitHub Releases</Badge>
                                    <Badge variant="secondary">Markdown Files</Badge>
                                    <Badge variant="secondary">Plain Text</Badge>
                                    <Badge variant="secondary">Canny</Badge>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="text-center">
                                <Button
                                    onClick={() => setShowImportModal(true)}
                                    size="lg"
                                    className="px-8"
                                >
                                    <Upload className="h-4 w-4 mr-2"/>
                                    Start Import
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Import Modal */}
            <ChangelogImportModal
                open={showImportModal}
                onOpenChange={setShowImportModal}
                projectId={projectId}
                onImportComplete={handleImportComplete}
            />
        </>
    );
}