export interface ProjectPreview {
    id: string
    name: string
    changelogCount: number
    lastUpdated: string
}

export interface Activity {
    id: string
    message: string
    projectId: string
    projectName: string
    timestamp: string
}

export interface DashboardStats {
    totalProjects: number
    totalChangelogs: number
    projectPreviews: ProjectPreview[]
    recentActivity: Activity[]
}