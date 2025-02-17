import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { Role } from '@prisma/client'

const setupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
    try {
        // Check if setup is already complete
        const userCount = await db.user.count()
        if (userCount > 0) {
            return NextResponse.json(
                { error: 'Setup has already been completed' },
                { status: 403 }
            )
        }

        // Validate request data
        const body = await request.json()
        const validatedData = setupSchema.parse(body)

        // Hash password
        const hashedPassword = await hashPassword(validatedData.password)

        // Create admin user
        const user = await db.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                role: Role.ADMIN,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        })

        return NextResponse.json({
            message: 'Setup completed successfully',
            user,
        })
    } catch (error) {
        console.error('Setup error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid input',
                    details: error.errors,
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to complete setup' },
            { status: 500 }
        )
    }
}