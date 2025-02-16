// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { z } from 'zod'

const registerSchema = z.object({
    token: z.string(),
    name: z.string().min(2),
    password: z.string().min(8),
})

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { token, name, password } = registerSchema.parse(body)

        // Start a transaction
        return await db.$transaction(async (tx) => {
            // Find and validate invitation
            const invitation = await tx.invitationLink.findFirst({
                where: {
                    token,
                    usedAt: null,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            })

            if (!invitation) {
                return NextResponse.json(
                    { error: 'Invalid or expired invitation' },
                    { status: 400 }
                )
            }

            // Hash password
            const hashedPassword = await hashPassword(password)

            // Create user
            const user = await tx.user.create({
                data: {
                    email: invitation.email,
                    name,
                    password: hashedPassword,
                    role: invitation.role,
                },
            })

            // Mark invitation as used
            await tx.invitationLink.update({
                where: { id: invitation.id },
                data: { usedAt: new Date() },
            })

            // Create default settings
            await tx.settings.create({
                data: {
                    userId: user.id,
                    theme: 'light',
                },
            })

            return NextResponse.json({ success: true })
        })
    } catch (error) {
        console.error('Registration error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Registration failed' },
            { status: 500 }
        )
    }
}