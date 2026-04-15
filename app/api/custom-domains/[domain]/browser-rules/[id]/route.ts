import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { canUserManageDomain } from '@/lib/custom-domains/service'

export const runtime = 'nodejs'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; id: string }> }
) {
    const { domain, id } = await params

    try {
        let user;
        try {
            user = await validateAuthAndGetUser();
        } catch {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const isAdmin = user.role === 'ADMIN'
        const canManage = await canUserManageDomain(domain, user.id, isAdmin)
        if (!canManage) {
            return NextResponse.json({ error: 'Unauthorized to manage this domain' }, { status: 403 })
        }

        const body = await request.json()
        const { isEnabled } = body

        if (typeof isEnabled !== 'boolean') {
            return NextResponse.json(
                { error: 'isEnabled must be a boolean' },
                { status: 400 }
            )
        }

        // Verify the rule exists and belongs to this domain
        const rule = await db.domainBrowserRule.findFirst({
            where: {
                id,
                domain: {
                    domain,
                },
            },
        })

        if (!rule) {
            return NextResponse.json(
                { error: 'Rule not found' },
                { status: 404 }
            )
        }

        // Update the rule
        const updatedRule = await db.domainBrowserRule.update({
            where: { id },
            data: { isEnabled },
        })

        return NextResponse.json({
            success: true,
            rule: updatedRule,
        })
    } catch (error) {
        console.error('[browser-rules/update] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update browser rule' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; id: string }> }
) {
    const { domain, id } = await params

    try {
        let user;
        try {
            user = await validateAuthAndGetUser();
        } catch {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const isAdmin = user.role === 'ADMIN'
        const canManage = await canUserManageDomain(domain, user.id, isAdmin)
        if (!canManage) {
            return NextResponse.json({ error: 'Unauthorized to manage this domain' }, { status: 403 })
        }

        // Verify the rule exists and belongs to this domain
        const rule = await db.domainBrowserRule.findFirst({
            where: {
                id,
                domain: {
                    domain,
                },
            },
        })

        if (!rule) {
            return NextResponse.json(
                { error: 'Rule not found' },
                { status: 404 }
            )
        }

        // Delete the rule
        await db.domainBrowserRule.delete({
            where: { id },
        })

        return NextResponse.json({
            success: true,
        })
    } catch (error) {
        console.error('[browser-rules/delete] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete browser rule' },
            { status: 500 }
        )
    }
}
