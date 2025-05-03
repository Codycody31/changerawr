'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SetupStep } from '@/components/setup/setup-step';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSetup } from '@/components/setup/setup-context';
import { toast } from '@/hooks/use-toast';

interface AdminStepProps {
    onNext: () => void;
    onBack: () => void;
}

const adminSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type AdminFormValues = z.infer<typeof adminSchema>;

export function AdminStep({ onNext, onBack }: AdminStepProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { markStepCompleted, isStepCompleted } = useSetup();
    const isCompleted = isStepCompleted('admin');

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<AdminFormValues>({
        resolver: zodResolver(adminSchema)
    });

    const onSubmit = async (data: AdminFormValues) => {
        if (isCompleted) {
            onNext();
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/setup/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create admin account');
            }

            markStepCompleted('admin');
            toast({
                title: 'Success',
                description: 'Admin account created successfully',
            });
            onNext();
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to create admin account',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SetupStep
            title="Create Admin Account"
            description="Set up your administrator account to manage the system"
            onNext={isCompleted ? onNext : undefined}
            onBack={onBack}
            isLoading={isSubmitting}
            isComplete={isCompleted}
            hideFooter={!isCompleted}
        >
            <form id="adminForm" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                        id="name"
                        {...register('name')}
                        placeholder="John Doe"
                        autoComplete="name"
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        {...register('email')}
                        type="email"
                        placeholder="admin@company.com"
                        autoComplete="email"
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        {...register('password')}
                        type="password"
                        autoComplete="new-password"
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id="confirmPassword"
                        {...register('confirmPassword')}
                        type="password"
                        autoComplete="new-password"
                    />
                    {errors.confirmPassword && (
                        <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                    )}
                </div>

                {!isCompleted && (
                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md font-medium"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating Account...' : 'Create Admin Account'}
                        </button>
                    </div>
                )}
            </form>
        </SetupStep>
    );
}