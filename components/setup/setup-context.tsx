'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

export type SetupStep = 'welcome' | 'admin' | 'settings' | 'oauth' | 'team' | 'complete';

interface SetupContextType {
    currentStep: SetupStep;
    setCurrentStep: (step: SetupStep) => void;
    completedSteps: SetupStep[];
    isLoading: boolean;
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    skipCurrentStep: () => void;
    isStepCompleted: (step: SetupStep) => boolean;
    markStepCompleted: (step: SetupStep) => void;
    checkSetupStatus: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

const stepOrder: SetupStep[] = ['welcome', 'admin', 'settings', 'oauth', 'team', 'complete'];

export const SetupProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
    const [completedSteps, setCompletedSteps] = useState<SetupStep[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const checkSetupStatus = async () => {
        setIsLoading(true);
        console.log('🔍 checkSetupStatus: Starting setup status check...');

        try {
            const response = await fetch('/api/setup');
            if (!response.ok) {
                throw new Error('Failed to check setup status');
            }

            const data = await response.json();
            console.log('📊 checkSetupStatus: API response:', data);

            if (data.isComplete) {
                console.log('✅ checkSetupStatus: Setup is complete, redirecting to login');
                router.replace('/login');
                return;
            }

            // Use the completed steps from API (which now enforces proper order)
            const completed: SetupStep[] = data.completedSteps || [];
            console.log('📝 checkSetupStatus: Completed steps from API:', completed);
            setCompletedSteps(completed);

            // TRUST THE API's currentStep - don't recalculate it here!
            const apiCurrentStep = data.currentStep as SetupStep;
            console.log(`🎯 checkSetupStatus: Using API's current step: ${apiCurrentStep}`);
            setCurrentStep(apiCurrentStep);

        } catch (error) {
            console.error('❌ checkSetupStatus: Error occurred:', error);
            console.log('🎬 checkSetupStatus: Error fallback - setting to welcome');
            setCurrentStep('welcome');
            toast({
                title: 'Error',
                description: 'Failed to check setup status',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            console.log('🏁 checkSetupStatus: Finished setup status check');
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

    const skipCurrentStep = useCallback(() => {
        // Same as goToNextStep, but semantically different for skippable steps
        goToNextStep();
    }, [goToNextStep]);

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
                skipCurrentStep,
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