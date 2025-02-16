import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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