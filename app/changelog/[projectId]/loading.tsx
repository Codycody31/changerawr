// app/changelog/[projectId]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function Loading() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-4xl py-8 px-4 md:py-12">
                <div className="text-center mb-12">
                    <Skeleton className="h-12 w-[300px] mx-auto mb-4" />
                    <Skeleton className="h-6 w-[400px] mx-auto" />
                </div>

                <div className="space-y-8">
                    {[...Array(5)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-[250px]" />
                                        <Skeleton className="h-5 w-[100px]" />
                                    </div>
                                    <Skeleton className="h-5 w-[120px]" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}