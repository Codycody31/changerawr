import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { Role } from '@prisma/client'

/**
 * Schema for validating setup request body.
 */
const setupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * Handles the initial setup of the admin user.
 * @method POST
 * @description Creates the first admin user in the system
 * @body {
 *   "type": "object",
 *   "required": ["name", "email", "password"],
 *   "properties": {
 *     "name": {
 *       "type": "string",
 *       "minLength": 2,
 *       "description": "Admin's full name"
 *     },
 *     "email": {
 *       "type": "string",
 *       "format": "email",
 *       "description": "Admin's email address"
 *     },
 *     "password": {
 *       "type": "string",
 *       "minLength": 8,
 *       "description": "Admin's password"
 *     }
 *   }
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "message": {
 *       "type": "string",
 *       "example": "Setup completed successfully"
 *     },
 *     "user": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string" },
 *         "email": { "type": "string" },
 *         "name": { "type": "string" },
 *         "role": { "type": "string" }
 *       }
 *     }
 *   }
 * }
 * @error 400 Validation failed - Invalid input data
 * @error 403 Setup already completed - Cannot run setup more than once
 * @error 500 An unexpected error occurred during setup
 */
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
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'An unexpected error occurred during setup' },
            { status: 500 }
        )
    }
}

/**
 * @method GET
 * @description Method not allowed - Setup endpoint only accepts POST requests
 * @response 405 {
 *   "type": "object",
 *   "properties": {
 *     "error": {
 *       "type": "string",
 *       "example": "Method not allowed"
 *     }
 *   }
 * }
 */
export async function GET() {
    return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
    )
}