import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { canUserManageDomain } from '@/lib/custom-domains/service'

export const runtime = 'nodejs'

/**
 * DELETE /api/custom-domains/:domain/ssl/revoke
 * Completely removes the current SSL certificate from the database.
 * This allows re-issuing a fresh certificate.
 *
 * Also attempts to notify nginx-agent to clean up SSL files (non-blocking).
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    try {
        let user;
        try {
            user = await validateAuthAndGetUser();
        } catch {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
        }

        const { domain: domainName } = await params

        const isAdmin = user.role === 'ADMIN'
        const canManage = await canUserManageDomain(domainName, user.id, isAdmin)
        if (!canManage) {
            return NextResponse.json({ success: false, error: 'Unauthorized to manage this domain' }, { status: 403 })
        }

        // Find the domain
        const domain = await db.customDomain.findUnique({
            where: { domain: domainName },
            include: {
                certificates: {
                    where: {
                        status: {
                            in: ['ISSUED', 'PENDING_HTTP01', 'PENDING_DNS01', 'FAILED']
                        }
                    }
                }
            }
        })

        if (!domain) {
            return NextResponse.json(
                { success: false, error: 'Domain not found' },
                { status: 404 }
            )
        }

        // Delete all certificates for this domain
        const deleteResult = await db.domainCertificate.deleteMany({
            where: { domainId: domain.id }
        })

        console.log(`[ssl/revoke] Deleted ${deleteResult.count} certificates for ${domainName}`)

        // Try to notify nginx-agent to clean up (don't fail if this doesn't work)
        try {
            const agentUrl = process.env.NGINX_AGENT_URL
            const internalSecret = process.env.INTERNAL_API_SECRET

            if (agentUrl && internalSecret) {
                await fetch(`${agentUrl}/domain/${encodeURIComponent(domainName)}`, {
                    method: 'DELETE',
                    headers: {
                        'X-Internal-Secret': internalSecret,
                    },
                    signal: AbortSignal.timeout(5000),
                })
                console.log(`[ssl/revoke] Notified nginx-agent to clean up ${domainName}`)
            }
        } catch (agentError) {
            // Log but don't fail the operation
            console.warn(`[ssl/revoke] Failed to notify nginx-agent (non-critical):`, agentError)
        }

        return NextResponse.json({
            success: true,
            message: `Deleted ${deleteResult.count} certificate(s)`,
            count: deleteResult.count
        })
    } catch (error) {
        console.error('[ssl/revoke] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to revoke certificate' },
            { status: 500 }
        )
    }
}
