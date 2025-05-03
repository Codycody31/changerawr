'use client';

import React from 'react';
import { User, Settings, Shield } from 'lucide-react';
import { SetupStep } from '@/components/setup/setup-step';

interface WelcomeStepProps {
    onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
    return (
        <SetupStep
            title="Welcome to Changerawr"
            description="Let's get your system set up in just a few steps"
            onNext={onNext}
            hideFooter={false}
            disableBack={true}
            nextLabel="Get Started"
        >
            <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                    <User className="h-6 w-6 mt-1 text-primary" />
                    <div>
                        <h3 className="font-medium">Admin Account</h3>
                        <p className="text-sm text-muted-foreground">
                            Create your administrator account
                        </p>
                    </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                    <Settings className="h-6 w-6 mt-1 text-primary" />
                    <div>
                        <h3 className="font-medium">System Settings</h3>
                        <p className="text-sm text-muted-foreground">
                            Configure your system preferences
                        </p>
                    </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-muted rounded-lg">
                    <Shield className="h-6 w-6 mt-1 text-primary" />
                    <div>
                        <h3 className="font-medium">Security</h3>
                        <p className="text-sm text-muted-foreground">
                            Set up your security preferences
                        </p>
                    </div>
                </div>
            </div>
        </SetupStep>
    );
}