import {NextRequest, NextResponse} from 'next/server'
import {db} from '@/lib/db'

export const runtime = 'nodejs'

// TRUE catch-all that handles ALL ACME challenge requests
export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    const pathname = url.pathname
    const hostname = request.headers.get('host')?.split(':')[0] || ''

    // Extract token from path: /.well-known/acme-challenge/TOKEN
    const pathParts = pathname.split('/')
    const token = pathParts[pathParts.length - 1]

    console.log(`[acme-challenge] 🔍 CATCH-ALL REQUEST`)
    console.log(`[acme-challenge]    URL: ${request.url}`)
    console.log(`[acme-challenge]    Pathname: ${pathname}`)
    console.log(`[acme-challenge]    Hostname: ${hostname}`)
    console.log(`[acme-challenge]    Token: ${token}`)
    console.log(`[acme-challenge]    Method: ${request.method}`)
    console.log(`[acme-challenge]    Protocol: ${request.headers.get('x-forwarded-proto') || 'unknown'}`)
    console.log(`[acme-challenge]    User-Agent: ${request.headers.get('user-agent')}`)
    console.log(`[acme-challenge]    All Headers:`, JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2))

    // If no token in path, return early
    if (!token || token === 'acme-challenge') {
        console.log(`[acme-challenge] ❌ No token in path`)
        return new NextResponse('No token provided', {status: 404})
    }

    console.log(`[acme-challenge] ⏳ Searching for challenge in database...`)

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

            console.log(`[acme-challenge] 📊 Attempt ${attempt + 1}/${maxAttempts} - Found ${allCerts.length} total certificates:`)
            allCerts.forEach(c => {
                console.log(`[acme-challenge]    - ${c.domain.domain}: status=${c.status}, token=${c.challengeToken}`)
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
                console.log(`[acme-challenge] ✅ FOUND challenge for ${cert.domain.domain}`)
                console.log(`[acme-challenge]    Status: ${cert.status}`)
                console.log(`[acme-challenge]    Token: ${cert.challengeToken}`)
                console.log(`[acme-challenge]    KeyAuth: ${cert.challengeKeyAuth.substring(0, 20)}...`)
                console.log(`[acme-challenge] 📤 Returning challenge response`)

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
                console.log(`[acme-challenge] 💤 Challenge not found yet, waiting 500ms...`)
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        } catch (error) {
            console.error(`[acme-challenge] ❌ Database error on attempt ${attempt + 1}:`, error)
            attempt++
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }
    }

    console.log(`[acme-challenge] ❌ Challenge NOT FOUND after ${maxAttempts} attempts`)
    console.log(`[acme-challenge]    Looking for: hostname=${hostname}, token=${token}`)

    return new NextResponse('Challenge not found', {
        status: 404,
        headers: {'Content-Type': 'text/plain'}
    })
}
