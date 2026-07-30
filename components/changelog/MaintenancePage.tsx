import {Wrench} from 'lucide-react'

interface MaintenancePageProps {
    projectName: string
    message?: string | null
}

export default function MaintenancePage({projectName, message}: MaintenancePageProps) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full mx-auto text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wrench className="w-8 h-8 text-primary"/>
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">{projectName}</h1>
                    <p className="text-lg font-medium text-muted-foreground">
                        Under Maintenance
                    </p>
                </div>
                <p className="text-sm text-muted-foreground">
                    {message?.trim() || "This changelog is temporarily unavailable while we perform maintenance. Please check back soon."}
                </p>
            </div>
        </div>
    )
}
