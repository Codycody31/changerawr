'use client'

import { createContext, useContext } from 'react'

export interface SidebarOverrideContextType {
    isProjectSidebarActive: boolean
    setProjectSidebarActive: (active: boolean) => void
}

export const SidebarOverrideContext = createContext<SidebarOverrideContextType>({
    isProjectSidebarActive: false,
    setProjectSidebarActive: () => {},
})

export function useSidebarOverride() {
    return useContext(SidebarOverrideContext)
}
