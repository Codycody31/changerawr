'use client'

import { createContext, useContext } from 'react'

export interface SidebarOverrideContextType {
    isProjectSidebarActive: boolean
    setProjectSidebarActive: (active: boolean) => void
    isProjectSidebarCollapsed: boolean
    setProjectSidebarCollapsed: (collapsed: boolean) => void
}

export const SidebarOverrideContext = createContext<SidebarOverrideContextType>({
    isProjectSidebarActive: false,
    setProjectSidebarActive: () => {},
    isProjectSidebarCollapsed: false,
    setProjectSidebarCollapsed: () => {},
})

export function useSidebarOverride() {
    return useContext(SidebarOverrideContext)
}
