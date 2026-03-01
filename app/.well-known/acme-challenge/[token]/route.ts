import {NextRequest, NextResponse} from 'next/server'
import {db} from '@/lib/db'

export const runtime = 'nodejs'

// Catch-all for [token] route - handles dynamic token parameter
export async function GET(
    request: NextRequest,
    {params}: { params: Promise<{ token: string }> },
) {
    const {token} = await params
    const hostname = request.headers.get('host')?.split(':')[0] || ''

    console.log(`[acme-challenge/[token]] 🔍 DYNAMIC TOKEN ROUTE REQUEST`)
    console.log(`[acme-challenge/[token]]    URL: ${request.url}`)
    console.log(`[acme-challenge/[token]]    Hostname: ${hostname}`)
    console.log(`[acme-challenge/[token]]    Token param: ${token}`)
    console.log(`[acme-challenge/[token]]    Method: ${request.method}`)
    console.log(`[acme-challenge/[token]]    Protocol: ${request.headers.get('x-forwarded-proto') || 'unknown'}`)
    console.log(`[acme-challenge/[token]]    User-Agent: ${request.headers.get('user-agent')}`)
    console.log(`[acme-challenge/[token]]    All Headers:`, JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2))

    console.log(`[acme-challenge/[token]] ⏳ Searching for challenge in database...`)

    // Wait up to 10 seconds for the challenge to appear in the database
    const maxAttempts = 20 // 20 attempts * 500ms = 10 seconds
    let attempt = 0

    while (attempt < maxAttempts) {
        try {
            // Log ALL certificates for debugging
            const allCerts = await db.domainCertificate.findMany({
                select: {
                    id: true,
                    challengeToken: true,
                    status: true,
                    domain: {select: {domain: true}},
                    createdAt: true,
                },
                orderBy: {createdAt: 'desc'},
                take: 10,
            })

            console.log(`[acme-challenge/[token]] 📊 Attempt ${attempt + 1}/${maxAttempts} - Found ${allCerts.length} total certificates:`)
            allCerts.forEach(c => {
                console.log(`[acme-challenge/[token]]    - ${c.domain.domain}: status=${c.status}, token=${c.challengeToken}`)
            })

            // Search for matching challenge
            const cert = await db.domainCertificate.findFirst({
                where: {
                    challengeToken: token,
                    domain: {domain: hostname},
                },
                include: {
                    domain: {select: {domain: true}},
                },
            })

            if (cert?.challengeKeyAuth) {
                console.log(`[acme-challenge/[token]] ✅ FOUND challenge for ${cert.domain.domain}`)
                console.log(`[acme-challenge/[token]]    Status: ${cert.status}`)
                console.log(`[acme-challenge/[token]]    Token: ${cert.challengeToken}`)
                console.log(`[acme-challenge/[token]]    KeyAuth: ${cert.challengeKeyAuth.substring(0, 20)}...`)
                console.log(`[acme-challenge/[token]] 📤 Returning challenge response`)

                return new NextResponse(cert.challengeKeyAuth, {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'no-store',
                    },
                })
            }

            // Not found yet, wait and retry
            attempt++
            if (attempt < maxAttempts) {
                console.log(`[acme-challenge/[token]] 💤 Challenge not found yet, waiting 500ms...`)
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        } catch (error) {
            console.error(`[acme-challenge/[token]] ❌ Database error on attempt ${attempt + 1}:`, error)
            attempt++
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }
    }

    console.log(`[acme-challenge/[token]] ❌ Challenge NOT FOUND after ${maxAttempts} attempts`)
    console.log(`[acme-challenge/[token]]    Looking for: hostname=${hostname}, token=${token}`)

    return new NextResponse('Challenge not found', {
        status: 404,
        headers: {'Content-Type': 'text/plain'}
    })
}
