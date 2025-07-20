// components/projects/importing/ImportDataPrompt.tsx

'use client';

import {useState} from 'react';
import {Upload, FileText, Sparkles, ArrowRight, CheckCircle} from 'lucide-react';
import {motion} from 'framer-motion';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';

import {ChangelogImportModal} from './ChangelogImportModal';
import {ImportResult} from '@/lib/types/projects/importing';

interface ImportDataPromptProps {
    projectId: string;
    projectName: string;
    onImportComplete?: (result: ImportResult) => void;
    className?: string;
}

export function ImportDataPrompt({
                                     projectId,
                                     onImportComplete,
                                     className
                                 }: ImportDataPromptProps) {
    const [showImportModal, setShowImportModal] = useState(false);

    const handleImportComplete = (result: ImportResult) => {
        setShowImportModal(false);
        onImportComplete?.(result);
    };

    return (
        <>
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}
                className={className}
            >
                <Card
                    className="border-dashed border-2 border-muted-foreground/25 bg-gradient-to-br from-background to-muted/20">
                    <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                            <Sparkles className="h-8 w-8 text-primary"/>
                        </div>
                        <CardTitle className="text-xl">Jump-start Your Changelog</CardTitle>
                        <CardDescription className="text-base">
                            Already have changelog data? Import it to get started quickly with your existing entries.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Import Benefits */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center space-y-2">
                                <div className="mx-auto p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full w-fit">
                                    <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
                                </div>
                                <h4 className="font-medium text-sm">Easy Import</h4>
                                <p className="text-xs text-muted-foreground">
                                    Upload your CHANGELOG.md or paste content directly
                                </p>
                            </div>

                            <div className="text-center space-y-2">
                                <div className="mx-auto p-2 bg-green-100 dark:bg-green-900/20 rounded-full w-fit">
                                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400"/>
                                </div>
                                <h4 className="font-medium text-sm">Smart Parsing</h4>
                                <p className="text-xs text-muted-foreground">
                                    Automatically detects format and extracts entries
                                </p>
                            </div>

                            <div className="text-center space-y-2">
                                <div className="mx-auto p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full w-fit">
                                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400"/>
                                </div>
                                <h4 className="font-medium text-sm">Instant Setup</h4>
                                <p className="text-xs text-muted-foreground">
                                    Start with your complete changelog history
                                </p>
                            </div>
                        </div>

                        {/* Supported Formats */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm text-center">Supported Formats</h4>
                            <div className="flex flex-wrap justify-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                    Keep a Changelog
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    GitHub Releases
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    Markdown Lists
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    Custom Formats
                                </Badge>
                            </div>
                        </div>

                        {/* Example Preview */}
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <h4 className="font-medium text-sm">What gets imported:</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-600"/>
                                    <span>Version numbers and dates</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-600"/>
                                    <span>Entry titles and descriptions</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-600"/>
                                    <span>Categories and tags</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3 w-3 text-green-600"/>
                                    <span>Markdown formatting</span>
                                </div>
                            </div>
                        </div>

                        {/* Call to Action */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button
                                onClick={() => setShowImportModal(true)}
                                className="flex-1 group"
                                size="lg"
                            >
                                <Upload className="h-4 w-4 mr-2"/>
                                Import Existing Data
                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform"/>
                            </Button>

                            <Button
                                variant="outline"
                                className="flex-1"
                                size="lg"
                                asChild
                            >
                                <a href={`/dashboard/projects/${projectId}/changelog/new`}>
                                    Start Fresh Instead
                                </a>
                            </Button>
                        </div>

                        {/* Help Text */}
                        <p className="text-xs text-muted-foreground text-center">
                            Don&apos;t have existing data? No problem! You can always start fresh and build your
                            changelog from scratch.
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

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

// Empty State Component - Shows when no entries exist and user is admin
export function EmptyStateWithImport({
                                         projectId,
                                         isAdmin = false,
                                         onImportComplete
                                     }: {
    projectId: string;
    projectName: string;
    isAdmin?: boolean;
    onImportComplete?: (result: ImportResult) => void;
}) {
    const [showImportModal, setShowImportModal] = useState(false);

    if (!isAdmin) {
        return (
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className="text-center py-12"
            >
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
                <h3 className="text-xl font-semibold mb-2">No Changelog Entries</h3>
                <p className="text-muted-foreground">
                    This project doesn&apos;t have any changelog entries yet.
                </p>
            </motion.div>
        );
    }

    const handleImportComplete = (result: ImportResult) => {
        setShowImportModal(false);
        onImportComplete?.(result);
    };

    return (
        <>
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className="text-center py-12 space-y-6"
            >
                <div className="space-y-4">
                    <div className="mx-auto p-4 bg-muted/50 rounded-full w-fit">
                        <FileText className="h-12 w-12 text-muted-foreground"/>
                    </div>

                    <div>
                        <h3 className="text-2xl font-semibold mb-2">Ready to Start Your Changelog?</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            You can either import your existing changelog data or create your first entry from scratch.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                    <Button
                        onClick={() => setShowImportModal(true)}
                        className="group"
                        size="lg"
                    >
                        <Upload className="h-4 w-4 mr-2"/>
                        Import Existing Data
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform"/>
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        asChild
                    >
                        <a href={`/dashboard/projects/${projectId}/changelog/new`}>
                            <Sparkles className="h-4 w-4 mr-2"/>
                            Create First Entry
                        </a>
                    </Button>
                </div>

                {/* Quick Import Info */}
                <Card className="max-w-lg mx-auto">
                    <CardContent className="pt-6">
                        <div className="text-sm space-y-2">
                            <p className="font-medium">Quick Import Options:</p>
                            <ul className="text-muted-foreground space-y-1">
                                <li>• Upload your CHANGELOG.md file</li>
                                <li>• Paste markdown content directly</li>
                                <li>• Supports most common changelog formats</li>
                                <li>• Preview before importing</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

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