import React, {useState} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Shield, CheckCircle, XCircle, BarChart3, Heart, ArrowLeft, Frown} from 'lucide-react';
import {TelemetryState} from '@/lib/types/telemetry';
import {appInfo, getVersionString} from '@/lib/app-info';

interface TelemetryPromptModalProps {
    isOpen: boolean;
    onChoice: (choice: Extract<TelemetryState, 'enabled' | 'disabled'>) => Promise<void>;
    disableClose?: boolean;
}

type ModalStep = 'initial' | 'confirmation' | 'final-plea';

export const TelemetryPromptModal: React.FC<TelemetryPromptModalProps> = ({
                                                                              isOpen,
                                                                              onChoice,
                                                                              disableClose = true,
                                                                          }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState<ModalStep>('initial');
    const [confirmationText, setConfirmationText] = useState('');

    const handleChoice = async (choice: Extract<TelemetryState, 'enabled' | 'disabled'>) => {
        setIsLoading(true);
        try {
            await onChoice(choice);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNoThanks = () => {
        setCurrentStep('confirmation');
    };

    const handleConfirmOptOut = () => {
        setCurrentStep('final-plea');
    };

    const handleFinalOptOut = () => {
        handleChoice('disabled');
    };

    const handleGoBack = () => {
        setCurrentStep('initial');
    };

    const handleGoBackToConfirmation = () => {
        setCurrentStep('confirmation');
        setConfirmationText('');
    };

    const renderInitialStep = () => (
        <>
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
                                className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0"
                            />
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
                    onClick={handleNoThanks}
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
        </>
    );

    const renderConfirmationStep = () => (
        <>
            <DialogHeader className="text-center pb-2">
                <div
                    className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-950/30 rounded-full flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-orange-600 dark:text-orange-400"/>
                </div>
                <DialogTitle className="text-xl">
                    Are you sure?
                </DialogTitle>
                <p className="text-muted-foreground text-sm mt-2">
                    Here&apos;s why telemetry matters to us
                </p>
            </DialogHeader>

            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                <CardContent className="pt-4">
                    <div className="space-y-3">
                        <h4 className="font-medium text-orange-900 dark:text-orange-100">
                            Why this helps
                        </h4>
                        <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                            Telemetry was created to keep track of installations and is used on the website
                            mainly to display active installations. It&apos;s nice to know that I&apos;m making
                            a difference, which is what telemetry keeps track of.
                        </p>
                        <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed font-medium">
                            By opting out, I won&apos;t know if you&apos;re using {appInfo.name} at all, which sucks.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Shield className="w-4 h-4"/>
                <span>Your privacy is still protected - no personal data is ever collected</span>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-6">
                <Button
                    variant="ghost"
                    onClick={handleGoBack}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                >
                    <ArrowLeft className="w-4 h-4 mr-2"/>
                    Go Back
                </Button>
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <Button
                        variant="outline"
                        onClick={handleConfirmOptOut}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        Still Opt Out
                    </Button>
                    <Button
                        onClick={() => handleChoice('enabled')}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        Enable Telemetry
                    </Button>
                </div>
            </DialogFooter>
        </>
    );

    const renderFinalPleaStep = () => {
        const requiredText = "I'm sure";
        const isConfirmationValid = confirmationText.trim().toLowerCase() === requiredText.toLowerCase();

        return (
            <>
                <DialogHeader className="text-center pb-3">
                    <div
                        className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-3">
                        <Frown className="w-6 h-6 text-gray-600 dark:text-gray-400"/>
                    </div>
                    <DialogTitle className="text-xl">
                        Okay, I understand...
                    </DialogTitle>
                    <p className="text-muted-foreground text-sm mt-1">
                        Just one tiny favor before you go?
                    </p>
                </DialogHeader>

                <div className="space-y-4">
                    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                        <CardContent className="pt-4 pb-4">
                            <div className="space-y-3">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                                    One last thing
                                </h4>
                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                    If {appInfo.name} ever helps you out or saves you some time, maybe consider
                                    leaving a star on GitHub or telling a friend about it?
                                </p>
                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                    It would mean the world to me and helps other developers discover the project. 🌟
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <div
                            className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            <Heart className="w-4 h-4"/>
                            <span>Thanks for trying {appInfo.name} - I hope it serves you well!</span>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                To confirm you want to opt out, please type: <span
                                className="font-mono font-medium">{requiredText}</span>
                            </p>
                            <Input
                                placeholder={`Type "${requiredText}" to confirm`}
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                disabled={isLoading}
                                className="text-sm"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                    <Button
                        variant="ghost"
                        onClick={handleGoBackToConfirmation}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2"/>
                        Go Back
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                        <Button
                            variant="outline"
                            onClick={handleFinalOptOut}
                            disabled={isLoading || !isConfirmationValid}
                            className="w-full sm:w-auto"
                        >
                            {isLoading ? (
                                <>
                                    <div
                                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"/>
                                    Opting out...
                                </>
                            ) : (
                                'Got it, thanks anyway'
                            )}
                        </Button>
                        <Button
                            onClick={() => handleChoice('enabled')}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                        >
                            Fine, I&apos;ll enable it
                        </Button>
                    </div>
                </DialogFooter>
            </>
        );
    };

    return (
        <Dialog open={isOpen}>
            <DialogContent
                className="sm:max-w-lg"
                disableClose={disableClose}
            >
                {currentStep === 'initial' && renderInitialStep()}
                {currentStep === 'confirmation' && renderConfirmationStep()}
                {currentStep === 'final-plea' && renderFinalPleaStep()}
            </DialogContent>
        </Dialog>
    );
};