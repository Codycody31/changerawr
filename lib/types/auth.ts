import {Settings} from "@prisma/client";

export enum Role {
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
    VIEWER = 'VIEWER'
}

export interface User {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date;
    settings: Settings;
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

// utils
// Permission helpers that properly handle undefined/null roles
export const hasAdminAccess = (role: Role | null | undefined): boolean =>
    role === Role.ADMIN;

export const hasStaffAccess = (role: Role | null | undefined): boolean =>
    role === Role.ADMIN || role === Role.STAFF;

export const canManageChangelog = (role: Role | null | undefined): boolean =>
    hasStaffAccess(role);

export const canApproveChanges = (role: Role | null | undefined): boolean =>
    hasAdminAccess(role);

// Type guard to check if a value is a valid Role
export const isValidRole = (role: unknown): role is Role => {
    return typeof role === 'string' && Object.values(Role).includes(role as Role);
};