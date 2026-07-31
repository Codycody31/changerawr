'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ImportingStepProps {
    progress: number;
    status: string;
}

export function ImportingStep({ progress, status }: ImportingStepProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
        >
            <div className="relative">
                <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary/20" />
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>

            <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">Importing Entries</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{status || 'Please wait...'}</p>
            </div>

            <div className="w-full max-w-sm space-y-1.5">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
            </div>
        </motion.div>
    );
}
