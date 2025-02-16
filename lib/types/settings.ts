// types/settings.ts

import { Role } from "@prisma/client"

export interface ProjectSettings {
    id: string
    name: string
    isPublic: boolean
    allowAutoPublish: boolean
    requireApproval: boolean
    defaultTags: string[]
    updatedAt: string
}

export type ProjectSettingsFormData = Omit<ProjectSettings, 'id' | 'updatedAt'>

export interface ProjectSettingsUpdateRequest extends Partial<ProjectSettingsFormData> {
    projectId: string
}

export interface ProjectSettingsResponse {
    success: boolean
    data?: ProjectSettings
    error?: string
}

// For role-based access control in settings
export interface SettingsPermission {
    role: Role
    actions: SettingsAction[]
}

export type SettingsAction =
    | 'view'
    | 'edit'
    | 'delete'
    | 'manage_tags'
    | 'manage_access'
    | 'manage_approval'

export interface SettingsTab {
    id: TabId
    label: string
    icon: string
    requiredPermission?: SettingsAction
}

export type TabId = 'general' | 'access' | 'tags' | 'danger'

// Validation schemas (if using Zod)
export const settingsValidationSchemas = {
    projectName: {
        min: 2,
        max: 50,
        message: 'Project name must be between 2 and 50 characters'
    },
    tag: {
        min: 1,
        max: 20,
        message: 'Tag must be between 1 and 20 characters'
    }
} as const

// API routes type definitions
export interface SettingsAPIRoutes {
    base: '/api/projects/:projectId/settings'
    methods: {
        GET: {
            response: ProjectSettingsResponse
        }
        PATCH: {
            body: ProjectSettingsUpdateRequest
            response: ProjectSettingsResponse
        }
        DELETE: {
            response: { success: boolean, error?: string }
        }
    }
}

// Error types
export interface SettingsError extends Error {
    code: SettingsErrorCode
    field?: keyof ProjectSettings
}

export type SettingsErrorCode =
    | 'INVALID_INPUT'
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'SERVER_ERROR'
    | 'VALIDATION_ERROR'

// Event types
export interface SettingsChangeEvent {
    type: 'settings_updated' | 'settings_deleted'
    projectId: string
    changes?: Partial<ProjectSettings>
    timestamp: string
    userId: string
}

// Utility types
export type SettingsKey = keyof ProjectSettings
export type SettingsValue = ProjectSettings[SettingsKey]

export interface SettingsAuditLog {
    id: string
    projectId: string
    userId: string
    action: SettingsAction
    changes: Partial<ProjectSettings>
    createdAt: string
}