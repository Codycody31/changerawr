import { RequestManagement } from '@/components/admin/requests/Management'

export default function AdminRequestsPage() {
    return (
        <div className="container max-w-7xl p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Pending Requests</h1>
                <p className="text-muted-foreground">
                    Review and manage requests for destructive actions
                </p>
            </div>
            <RequestManagement />
        </div>
    )
}