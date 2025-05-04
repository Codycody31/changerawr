'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

// Define the shape of our setup state
export type SetupStep = 'welcome' | 'admin' | 'settings' | 'oauth' | 'complete'

export interface AdminData {
    name: string
    email: string
    password: string
}

export interface SystemSettings {
    defaultInvitationExpiry: number
    requireApprovalForChangelogs: boolean
    maxChangelogEntriesPerProject: number
    enableAnalytics: boolean
    enableNotifications: boolean
    enablePasswordReset: boolean
    smtpConfig?: {
        host: string
        port: number
        user?: string
        password?: string
        secure: boolean
        systemEmail: string
    }
}

export interface OAuthSettings {
    enabled: boolean
    provider?: string
    baseUrl?: string
    clientId?: string
    clientSecret?: string
}

export interface SetupState {
    isLoading: boolean
    currentStep: SetupStep
    completedSteps: SetupStep[]
    adminData: AdminData | null
    systemSettings: SystemSettings | null
    oauthSettings: OAuthSettings | null
    error: string | null
}

export interface SetupContextType extends SetupState {
    goToStep: (step: SetupStep) => void
    setAdminData: (data: AdminData) => void
    setSystemSettings: (data: SystemSettings) => void
    setOAuthSettings: (data: OAuthSettings) => void
    completeSetup: () => void
    clearError: () => void
    checkSetupStatus: () => Promise<boolean>
}

// Default state
const defaultState: SetupState = {
    isLoading: true,
    currentStep: 'welcome',
    completedSteps: [],
    adminData: null,
    systemSettings: null,
    oauthSettings: {
        enabled: false
    },
    error: null
}

// Create the context
const SetupContext = createContext<SetupContextType | undefined>(undefined)

// Provider component
export function SetupProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SetupState>(defaultState)
    const router = useRouter()

    // Load state from session storage if available
    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem('setupState')
            if (savedState) {
                const parsedState = JSON.parse(savedState)
                setState(prev => ({ ...prev, ...parsedState, isLoading: false }))
            } else {
                setState(prev => ({ ...prev, isLoading: false }))
            }
        } catch {
            setState(prev => ({ ...prev, isLoading: false }))
        }
    }, [])

    // Save state to session storage when it changes
    useEffect(() => {
        if (!state.isLoading) {
            const stateToSave = {
                currentStep: state.currentStep,
                completedSteps: state.completedSteps,
                adminData: state.adminData,
                systemSettings: state.systemSettings,
                oauthSettings: state.oauthSettings,
            }
            sessionStorage.setItem('setupState', JSON.stringify(stateToSave))
        }
    }, [state])

    // Check if setup has already been completed
    const checkSetupStatus = async (): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isLoading: true }))
            const response = await fetch('/api/setup/status')
            const data = await response.json()

            if (data.isComplete) {
                router.replace('/login')
                return true
            }

            setState(prev => ({ ...prev, isLoading: false }))
            return false
        } catch {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Failed to check setup status. Please try again.'
            }))
            return false
        }
    }

    // Navigation between steps
    const goToStep = (step: SetupStep) => {
        setState(prev => ({ ...prev, currentStep: step }))
    }

    // Set admin data
    const setAdminData = (data: AdminData) => {
        setState(prev => ({
            ...prev,
            adminData: data,
            completedSteps: [...prev.completedSteps.filter(s => s !== 'admin'), 'admin']
        }))
    }

    // Set system settings
    const setSystemSettings = (data: SystemSettings) => {
        setState(prev => ({
            ...prev,
            systemSettings: data,
            completedSteps: [...prev.completedSteps.filter(s => s !== 'settings'), 'settings']
        }))
    }

    // Set OAuth settings
    const setOAuthSettings = (data: OAuthSettings) => {
        setState(prev => ({
            ...prev,
            oauthSettings: data,
            completedSteps: [...prev.completedSteps.filter(s => s !== 'oauth'), 'oauth']
        }))
    }

    // Complete the setup process
    const completeSetup = () => {
        setState(prev => ({
            ...prev,
            currentStep: 'complete',
            completedSteps: [...prev.completedSteps, 'complete']
        }))
        // Clear session storage as setup is complete
        sessionStorage.removeItem('setupState')
    }

    // Clear error
    const clearError = () => {
        setState(prev => ({ ...prev, error: null }))
    }

    const value = {
        ...state,
        goToStep,
        setAdminData,
        setSystemSettings,
        setOAuthSettings,
        completeSetup,
        clearError,
        checkSetupStatus
    }

    return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>
}

// Custom hook to use the setup context
export function useSetup() {
    const context = useContext(SetupContext)
    if (context === undefined) {
        throw new Error('useSetup must be used within a SetupProvider')
    }
    return context
}