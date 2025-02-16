'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function NewProjectPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [name, setName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const createProject = useMutation({
        mutationFn: async (data: { name: string }) => {
            const response = await fetch('/api/projects', {
                method: 'POST',
                credentials: 'include', // This ensures cookies are sent with the request
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })

            if (!response.ok) {
                throw new Error('Failed to create project')
            }

            return response.json()
        },
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Project created successfully'
            })
            router.push('/dashboard/projects')
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'Failed to create project',
                variant: 'destructive'
            })
            setIsSubmitting(false)
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        createProject.mutate({ name })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">New Project</h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/projects')}
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={isSubmitting || !name.trim()}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Project'
                        )}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter project name"
                            />
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}