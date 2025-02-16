import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

export async function GET(request: Request) {
    try {
        // Validate that the user is an admin
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1', 10)
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
        const search = searchParams.get('search') || ''
        const action = searchParams.get('action') || ''

        // Calculate pagination
        const skip = (page - 1) * pageSize

        // Build where clause for filtering
        const where: Record<string, unknown> = {}
        if (search) {
            where.OR = [
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
                { action: { contains: search, mode: 'insensitive' } }
            ]
        }
        if (action) {
            where.action = action
        }

        // Fetch audit logs with pagination and include user details
        const [logs, total] = await Promise.all([
            db.auditLog.findMany({
                where,
                take: pageSize,
                skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    targetUser: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            }),
            db.auditLog.count({ where })
        ])

        return NextResponse.json({
            logs,
            total
        })
    } catch (error) {
        console.error('Audit logs fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }
}