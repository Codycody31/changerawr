import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

/**
 * @method GET
 * @description Fetches audit logs based on filters and pagination or chunking
 * @query {
 *   page: Number, default: 1
 *   pageSize: Number, default: 20
 *   cursor: String, optional, for chunk-based pagination
 *   chunkSize: Number, default: 100, for chunk-based loading
 *   useChunking: boolean, optional, enables chunked data loading
 *   search: String, optional
 *   action: String, optional
 *   from: Date, optional
 *   to: Date, optional
 *   userId: String, optional
 *   targetId: String, optional
 *   export: boolean, optional
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "logs": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "action": { "type": "string" },
 *           "performer": {
 *             "type": "object",
 *             "properties": {
 *               "name": { "type": "string" },
 *               "email": { "type": "string" }
 *             }
 *           },
 *           "performer_email": { "type": "string" },
 *           "target": {
 *             "type": "object",
 *             "properties": {
 *               "name": { "type": "string" },
 *               "email": { "type": "string" }
 *             }
 *           },
 *           "target_email": { "type": "string" },
 *           "details": { "type": "string" },
 *           "createdAt": { "type": "string", "format": "date-time" }
 *         }
 *       }
 *     },
 *     "total": { "type": "number" },
 *     "pages": { "type": "number" },
 *     "nextCursor": { "type": "string" }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 500 An unexpected error occurred while fetching audit logs
 */
export async function GET(request: Request) {
    try {
        // Validate admin access
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url)
        const useChunking = searchParams.get('useChunking') === 'true'
        const cursor = searchParams.get('cursor') || ''
        const chunkSize = parseInt(searchParams.get('chunkSize') || '100', 10)
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
                            .map(val => `"${String(val).replace(/"/g, '""')}"`)
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

        // Get total count for pagination
        const total = await db.auditLog.count({ where })

        // Determine fetching method: chunking or pagination
        if (useChunking) {
            let logs;

            if (cursor) {
                // If cursor is provided, use cursor-based pagination
                logs = await db.auditLog.findMany({
                    where,
                    take: chunkSize,
                    cursor: {
                        id: cursor
                    },
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

                // Remove the cursor item from the result
                if (logs.length > 0 && logs[0].id === cursor) {
                    logs = logs.slice(1)
                }
            } else {
                // Initial fetch without cursor
                logs = await db.auditLog.findMany({
                    where,
                    take: chunkSize,
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
            }

            // Get last item for next cursor
            const nextCursor = logs.length > 0 ? logs[logs.length - 1].id : null

            return NextResponse.json({
                logs,
                total,
                pages: Math.ceil(total / chunkSize),
                nextCursor
            })
        } else {
            // Standard pagination
            const skip = (page - 1) * pageSize

            const logs = await db.auditLog.findMany({
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
            })

            return NextResponse.json({
                logs,
                total,
                pages: Math.ceil(total / pageSize)
            })
        }
    } catch (error) {
        console.error('Audit logs fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch audit logs' },
            { status: 500 }
        )
    }
}