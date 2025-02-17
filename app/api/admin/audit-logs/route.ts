import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

export async function GET(request: Request) {
    try {
        // Validate admin access
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1', 10)
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
        const search = searchParams.get('search') || ''
        const action = searchParams.get('action') || ''
        const from = searchParams.get('from') || ''
        const to = searchParams.get('to') || ''
        const userId = searchParams.get('userId') || ''
        const targetId = searchParams.get('targetId') || ''
        const isExport = searchParams.get('export') === 'true'

        // Build where clause for filtering
        const where: { createdAt?: { gte?: Date; lte?: Date }; [key: string]: unknown } = {}

        // Date range filter
        if (from || to) {
            where.createdAt = {}
            if (from) where.createdAt.gte = new Date(from)
            if (to) where.createdAt.lte = new Date(to)
        }

        // Action filter
        if (action) {
            where.action = action
        }

        // User ID filters
        if (userId) where.userId = userId
        if (targetId) where.targetUserId = targetId

        // Search filter
        if (search) {
            where.OR = [
                {
                    user: {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                },
                {
                    targetUser: {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                },
                { action: { contains: search, mode: 'insensitive' } }
            ]
        }

        // If exporting, return all matching records
        if (isExport) {
            const logs = await db.auditLog.findMany({
                where,
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
            })

            // Convert logs to CSV format
            const csvContent = logs.map(log => ({
                timestamp: log.createdAt,
                action: log.action,
                performer: log.user.name || log.user.email,
                performer_email: log.user.email,
                target: log.targetUser ? (log.targetUser.name || log.targetUser.email) : 'N/A',
                target_email: log.targetUser?.email || 'N/A',
                details: log.details ? JSON.stringify(log.details) : ''
            }))

            return new NextResponse(
                [
                    // CSV Headers
                    Object.keys(csvContent[0] || {}).join(','),
                    // CSV Data
                    ...csvContent.map(row =>
                        Object.values(row)
                            .map(val => `"${val}"`)
                            .join(',')
                    )
                ].join('\n'),
                {
                    headers: {
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
                    }
                }
            )
        }

        // Calculate pagination
        const skip = (page - 1) * pageSize

        // Fetch logs with pagination
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
            total,
            pages: Math.ceil(total / pageSize)
        })
    } catch (error) {
        console.error('Audit logs fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch audit logs' },
            { status: 500 }
        )
    }
}