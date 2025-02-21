import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getGravatarUrl } from '@/lib/utils/gravatar'

const previewSchema = z.object({
    email: z.string().email()
})

/**
 * @method POST
 * @description Creates a preview of a user's information
 * @path /api/preview
 * @request {json}
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "id": { "type": "string" },
 *     "name": { "type": "string" },
 *     "email": { "type": "string" },
 *     "avatarUrl": { "type": "string" }
 *   }
 * }
 * @error 400 Invalid input - Email must be a valid email address
 * @error 404 User not found
 * @error 500 An unexpected error occurred while creating the preview
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email } = previewSchema.parse(body)

        const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                name: true,
                email: true,
            },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        const avatarUrl = getGravatarUrl(user.email, 160)

        return NextResponse.json({
            ...user,
            avatarUrl
        })
    } catch (error) {
        console.error('Preview error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}