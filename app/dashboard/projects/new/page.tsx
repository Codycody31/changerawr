'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
    Loader2,
    Rocket,
    CheckCircle2,
    AlertCircle,
    FileText
} from 'lucide-react'

export default function NewProjectPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [name, setName] = useState('')
    const [showSuccess, setShowSuccess] = useState(false)

    const createProject = useMutation({
        mutationFn: async (data: { name: string }) => {
            const response = await fetch('/api/projects', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to create project')
            }

            return response.json()
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onSuccess: (data) => {
            // Trigger confetti celebration
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981']
            })

            setShowSuccess(true)

            // Navigate after showing success
            setTimeout(() => {
                toast({
                    title: 'Success',
                    description: 'Project created successfully'
                })
                router.push('/dashboard/projects')
            }, 1500)
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create project',
                variant: 'destructive'
            })
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        createProject.mutate({ name: name.trim() })
    }

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-6"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto"
                    >
                        <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </motion.div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">Project Created!</h1>
                        <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">&ldquo;{name}&rdquo;</span> is ready to go
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirecting...</span>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background overflow-hidden">
            {/* Main Content */}
            <div className="container py-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="w-full max-w-md space-y-8">
                    {/* Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-4"
                    >
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                            <Rocket className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold mb-2">Create New Project</h1>
                            <p className="text-muted-foreground">
                                Start tracking changes for your project
                            </p>
                        </div>
                    </motion.div>

                    {/* Error Alert */}
                    <AnimatePresence>
                        {createProject.isError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {createProject.error?.message || 'Failed to create project'}
                                    </AlertDescription>
                                </Alert>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold">Project Details</h2>
                                        <p className="text-sm text-muted-foreground">Give your project a name</p>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="name" className="text-sm font-medium">
                                            Project Name
                                        </Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., My Website, Mobile App, API Service"
                                            className="h-11"
                                            disabled={createProject.isPending}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.push('/dashboard/projects')}
                                            disabled={createProject.isPending}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>

                                        <Button
                                            type="submit"
                                            disabled={!name.trim() || createProject.isPending}
                                            className="flex-1 gap-2"
                                        >
                                            {createProject.isPending ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <Rocket className="h-4 w-4" />
                                                    Create Project
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}