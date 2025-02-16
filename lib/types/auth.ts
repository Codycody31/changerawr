import { Role } from '@prisma/client'

export interface User {
    id: string
    email: string
    name?: string | null
    role: Role
}

export interface LoginCredentials {
    email: string
    password: string
}

export interface AuthTokens {
    accessToken: string
    refreshToken: string
}

export interface LoginResponse {
    user: {
        id: string
        email: string
        name: string | null
        role: Role
        lastLoginAt: Date | null
    }
    accessToken: string
    refreshToken: string
}

export interface RefreshTokenResponse {
    accessToken: string
    user: User
}