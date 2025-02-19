// app/changelog/[projectId]/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center space-y-4 px-4">
                <h1 className="text-4xl font-bold tracking-tight">Changelog Not Found</h1>
                <p className="text-muted-foreground max-w-[500px] mx-auto">
                    The changelog you&apos;re looking for doesn&apos;t exist or isn&apos;t publicly available.
                </p>
                <Button asChild>
                    <Link href="/">Return Home</Link>
                </Button>
            </div>
        </div>
    )
}