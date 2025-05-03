'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

export type SetupStep = 'welcome' | 'admin' | 'settings' | 'oauth' | 'complete';

interface SetupContextType {
    currentStep: SetupStep;
    setCurrentStep: (step: SetupStep) => void;
    completedSteps: SetupStep[];
    isLoading: boolean;
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    isStepCompleted: (step: SetupStep) => boolean;
    markStepCompleted: (step: SetupStep) => void;
    checkSetupStatus: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

const stepOrder: SetupStep[] = ['welcome', 'admin', 'settings', 'oauth', 'complete'];

export const SetupProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
    const [completedSteps, setCompletedSteps] = useState<SetupStep[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const checkSetupStatus = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/setup');
            if (!response.ok) {
                throw new Error('Failed to check setup status');
            }

            const data = await response.json();

            if (data.isComplete) {
                router.replace('/login');
                return;
            }

            // Set completed steps based on server response
            const completed: SetupStep[] = [];
            if (data.adminCreated) completed.push('admin');
            if (data.settingsConfigured) completed.push('settings');
            if (data.oauthConfigured) completed.push('oauth');

            setCompletedSteps(completed);

            // Determine current step
            if (completed.length === 0) {
                setCurrentStep('welcome');
            } else {
                const lastCompleted = completed[completed.length - 1];
                const nextStepIndex = stepOrder.indexOf(lastCompleted) + 1;
                setCurrentStep(stepOrder[nextStepIndex] || 'welcome');
            }
        } catch {
            toast({
                title: 'Error',
                description: 'Failed to check setup status',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkSetupStatus();
    }, []);

    const goToNextStep = () => {
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
            setCurrentStep(stepOrder[currentIndex + 1]);
        }
    };

    const goToPreviousStep = () => {
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(stepOrder[currentIndex - 1]);
        }
    };

    const isStepCompleted = (step: SetupStep) => {
        return completedSteps.includes(step);
    };

    const markStepCompleted = (step: SetupStep) => {
        if (!completedSteps.includes(step)) {
            setCompletedSteps([...completedSteps, step]);
        }
    };

    return (
        <SetupContext.Provider
            value={{
                currentStep,
                setCurrentStep,
                completedSteps,
                isLoading,
                goToNextStep,
                goToPreviousStep,
                isStepCompleted,
                markStepCompleted,
                checkSetupStatus
            }}
        >
            {children}
        </SetupContext.Provider>
    );
};

export const useSetup = () => {
    const context = useContext(SetupContext);
    if (context === undefined) {
        throw new Error('useSetup must be used within a SetupProvider');
    }
    return context;
};