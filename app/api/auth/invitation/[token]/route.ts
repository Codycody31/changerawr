import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * @openapi
 * @auth bearer
 * @desc Handles GET requests to validate an invitation token.
 * @params {object} params - The request parameters.
 * @params {string} params.token - The invitation token.
 * @response {object} 200 - Successful response.
 * @response {string} 200.email - The email associated with the invitation.
 * @response {string} 200.role - The role associated with the invitation.
 * @response {string} 200.expiresAt - The expiration date of the invitation.
 * @response {object} 400 - Bad request response.
 * @response {string} 400.message - The error message.
 * @response {object} 404 - Not found response.
 * @response {string} 404.message - The error message.
 * @response {object} 500 - Internal server error response.
 * @response {string} 500.message - The error message.
 */
export async function GET(
    request: Request,
    { params }: { params: { token: string } }
) {
    if (!params.token) {
        return NextResponse.json(
            { message: 'Token is required' },
            { status: 400 }
        )
    }

    try {
        console.log(`Checking invitation token: ${params.token}`)

        const invitation = await db.invitationLink.findUnique({
            where: {
                token: params.token
            }
        })

        console.log('Database result:', invitation)

        if (!invitation) {
            return NextResponse.json(
                { message: 'Invitation not found' },
                { status: 404 }
            )
        }

        if (invitation.usedAt) {
            return NextResponse.json(
                { message: 'Invitation has already been used' },
                { status: 400 }
            )
        }

        if (invitation.expiresAt < new Date()) {
            return NextResponse.json(
                { message: 'Invitation has expired' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt.toISOString()
        })

    } catch (error) {
        console.error('Server error validating invitation:', error)
        return NextResponse.json(
            { message: 'Error validating invitation' },
            { status: 500 }
        )
    }
}