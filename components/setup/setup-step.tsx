'use client';

import React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetupStepProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    onNext?: () => void;
    onBack?: () => void;
    isLoading?: boolean;
    isComplete?: boolean;
    disableNext?: boolean;
    disableBack?: boolean;
    hideFooter?: boolean;
    nextLabel?: string;
    backLabel?: string;
    className?: string;
    children: React.ReactNode;
}

export function SetupStep({
                              title,
                              description,
                              icon,
                              onNext,
                              onBack,
                              isLoading = false,
                              isComplete = false,
                              disableNext = false,
                              disableBack = false,
                              hideFooter = false,
                              nextLabel = 'Continue',
                              backLabel = 'Back',
                              className,
                              children,
                          }: SetupStepProps) {
    return (
        <Card className={cn("w-full max-w-lg", className)}>
            <CardHeader>
                {icon && <div className="flex justify-center mb-4">{icon}</div>}
                <CardTitle className="text-2xl">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>{children}</CardContent>
            {!hideFooter && (
                <CardFooter className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        disabled={disableBack || isLoading || !onBack}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backLabel}
                    </Button>
                    <Button
                        onClick={onNext}
                        disabled={disableNext || isLoading || isComplete || !onNext}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : isComplete ? (
                            'Completed'
                        ) : (
                            <>
                                {nextLabel}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}