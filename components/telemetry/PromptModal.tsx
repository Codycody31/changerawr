import React, {useState} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Shield, CheckCircle, XCircle, BarChart3} from 'lucide-react';
import {TelemetryState} from '@/lib/types/telemetry';
import {appInfo, getVersionString} from '@/lib/app-info';

interface TelemetryPromptModalProps {
    isOpen: boolean;
    onChoice: (choice: Extract<TelemetryState, 'enabled' | 'disabled'>) => Promise<void>;
}

export const TelemetryPromptModal: React.FC<TelemetryPromptModalProps> = ({
                                                                              isOpen,
                                                                              onChoice,
                                                                          }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleChoice = async (choice: Extract<TelemetryState, 'enabled' | 'disabled'>) => {
        setIsLoading(true);
        try {
            await onChoice(choice);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <BarChart3 className="w-6 h-6 text-primary"/>
                    </div>
                    <DialogTitle className="text-xl">
                        Help Improve {appInfo.name}
                    </DialogTitle>
                    <p className="text-muted-foreground text-sm mt-2">
                        Share anonymous usage data to help us make {appInfo.name} better for everyone
                    </p>
                </DialogHeader>

                <div className="space-y-4">
                    {/* What we collect */}
                    <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                        <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                                <CheckCircle
                                    className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"/>
                                <div className="space-y-2">
                                    <h4 className="font-medium text-green-900 dark:text-green-100">
                                        What we collect
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            Version: {getVersionString()}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                            Environment: {appInfo.environment}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                            Anonymous instance ID
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* What we don't collect */}
                    <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
                        <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"/>
                                <div>
                                    <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
                                        What we don&apos;t collect
                                    </h4>
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        Personal data, logs, file contents, or any sensitive information
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Privacy notice */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <Shield className="w-4 h-4"/>
                        <span>All data is anonymized and used solely for product improvement</span>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 pt-6">
                    <Button
                        variant="outline"
                        onClick={() => handleChoice('disabled')}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        No Thanks
                    </Button>
                    <Button
                        onClick={() => handleChoice('enabled')}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        {isLoading ? (
                            <>
                                <div
                                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"/>
                                Setting up...
                            </>
                        ) : (
                            'Enable Telemetry'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};