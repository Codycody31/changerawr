import {NextResponse} from 'next/server'
import {db} from '@/lib/db'
import {validateAuthAndGetUser} from '@/lib/utils/changelog'

// Type definitions
interface PreservedUserData {
    id: string;
    email: string;
    name: string | null;
    role: string;
    deletedAt: string;
    deletedBy: string;
}

interface AuditLogDetails {
    [key: string]: unknown;

    _preservedUser?: PreservedUserData;
    _preservedTargetUser?: PreservedUserData;
    timestamp?: string;
    userAgent?: string;
    ipAddress?: string;
    // Action-specific details
    loginMethod?: string;
    successful?: boolean;
    sessionId?: string;
    newUserRole?: string;
    invitationUsed?: boolean;
    emailVerified?: boolean;
    projectName?: string;
    isPublic?: boolean;
    initialTeamSize?: number;
    version?: string;
    entryCount?: number;
    hasBreakingChanges?: boolean;
    itemType?: string;
    itemCount?: number;
    confirmed?: boolean;
    keyName?: string;
    permissions?: string[];
    expiresAt?: string;
    settingsChanged?: string[];
    previousValues?: Record<string, unknown>;
    itemId?: string;
    changeType?: string;
    metadata?: Record<string, unknown>;
}

interface DatabaseAuditLog {
    id: string;
    action: string;
    userId: string | null;
    targetUserId: string | null;
    details: AuditLogDetails | null;
    createdAt: Date;
    user: {
        name: string | null;
        email: string;
    } | null;
    targetUser: {
        name: string | null;
        email: string;
    } | null;
}

interface ProcessedUserInfo {
    name: string | null;
    email: string | null;
    isDeleted?: boolean;
}

interface ProcessedAuditLog extends Omit<DatabaseAuditLog, 'user' | 'targetUser' | 'createdAt'> {
    createdAt: string; // Converted to ISO string
    performer: ProcessedUserInfo | null;
    performer_email: string | null;
    target: ProcessedUserInfo | null;
    target_email: string | null;
}

interface CsvLogEntry {
    timestamp: Date;
    action: string;
    performer: string;
    performer_email: string;
    performer_deleted: string;
    target: string;
    target_email: string;
    target_deleted: string;
    details: string;
}

interface AuditLogsResponse {
    logs: ProcessedAuditLog[];
    total: number;
    pages: number;
    nextCursor: string | null;
    hasMore: boolean;
    currentCount: number;
}

interface WhereClause {
    createdAt?: {
        gte?: Date;
        lte?: Date;
    };
    action?: string;
    userId?: string;
    targetUserId?: string;
    OR?: Array<{
        user?: {
            OR: Array<{
                name?: { contains: string; mode: 'insensitive' };
                email?: { contains: string; mode: 'insensitive' };
            }>;
        };
        targetUser?: {
            OR: Array<{
                name?: { contains: string; mode: 'insensitive' };
                email?: { contains: string; mode: 'insensitive' };
            }>;
        };
        action?: { contains: string; mode: 'insensitive' };
        details?: {
            path: string[];
            string_contains: string;
        };
    }>;
}

/**
 * Get user info from log (either from user relation or preserved data)
 */
function getLogUserInfo(log: DatabaseAuditLog, isTarget = false): ProcessedUserInfo | null {
    const userKey = isTarget ? 'targetUser' : 'user';
    const preservedKey = isTarget ? '_preservedTargetUser' : '_preservedUser';

    // First try to get from user relation
    if (log[userKey]) {
        return {
            name: log[userKey]?.name || null,
            email: log[userKey]?.email || null
        };
    }

    // If user relation is null, try to get from preserved data
    if (log.details && log.details[preservedKey]) {
        const preserved = log.details[preservedKey];
        return {
            name: preserved?.name || null,
            email: preserved?.email || null,
            isDeleted: true // Flag to indicate this user was deleted
        };
    }

    // Return null if no user info available
    return null;
}

/**
 * Process logs to include preserved user info and format dates
 */
function processLogs(logs: DatabaseAuditLog[]): ProcessedAuditLog[] {
    return logs.map(log => {
        const performer = getLogUserInfo(log, false);
        const target = getLogUserInfo(log, true);

        return {
            ...log,
            createdAt: log.createdAt.toISOString(),
            performer: performer ? {
                name: performer.name,
                email: performer.email,
                isDeleted: performer.isDeleted || false
            } : null,
            performer_email: performer?.email || null,
            target: target ? {
                name: target.name,
                email: target.email,
                isDeleted: target.isDeleted || false
            } : null,
            target_email: target?.email || null
        };
    });
}

/**
 * Convert logs to CSV format
 */
function convertLogsToCSV(logs: DatabaseAuditLog[]): string {
    const csvContent: CsvLogEntry[] = logs.map(log => {
        const performer = getLogUserInfo(log, false);
        const target = getLogUserInfo(log, true);

        return {
            timestamp: log.createdAt,
            action: log.action,
            performer: performer ? (performer.name || performer.email || 'Unknown User') : 'Unknown User',
            performer_email: performer?.email || 'Unknown',
            performer_deleted: performer?.isDeleted ? 'Yes' : 'No',
            target: target ? (target.name || target.email || 'N/A') : 'N/A',
            target_email: target?.email || 'N/A',
            target_deleted: target?.isDeleted ? 'Yes' : 'No',
            details: log.details ? JSON.stringify(log.details) : ''
        };
    });

    return [
        // CSV Headers
        Object.keys(csvContent[0] || {}).join(','),
        // CSV Data
        ...csvContent.map(row =>
            Object.values(row)
                .map(val => `"${String(val).replace(/"/g, '""')}"`)
                .join(',')
        )
    ].join('\n');
}

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
 *               "email": { "type": "string" },
 *               "isDeleted": { "type": "boolean" }
 *             }
 *           },
 *           "performer_email": { "type": "string" },
 *           "target": {
 *             "type": "object",
 *             "properties": {
 *               "name": { "type": "string" },
 *               "email": { "type": "string" },
 *               "isDeleted": { "type": "boolean" }
 *             }
 *           },
 *           "target_email": { "type": "string" },
 *           "details": { "type": "object" },
 *           "createdAt": { "type": "string", "format": "date-time" }
 *         }
 *       }
 *     },
 *     "total": { "type": "number" },
 *     "pages": { "type": "number" },
 *     "nextCursor": { "type": "string" },
 *     "hasMore": { "type": "boolean" },
 *     "currentCount": { "type": "number" }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 500 An unexpected error occurred while fetching audit logs
 */
export async function GET(request: Request): Promise<NextResponse<AuditLogsResponse | { error: string }>> {
    try {
        // Validate admin access
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({error: 'Unauthorized'}, {status: 403})
        }

        // Parse query parameters
        const {searchParams} = new URL(request.url)
        const useChunking = searchParams.get('useChunking') === 'true'
        const cursor = searchParams.get('cursor') || ''
        const chunkSize = Math.min(parseInt(searchParams.get('chunkSize') || '100', 10), 500) // Limit max chunk size
        const page = parseInt(searchParams.get('page') || '1', 10)
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
        const search = searchParams.get('search') || ''
        const action = searchParams.get('action') || ''
        const from = searchParams.get('from') || ''
        const to = searchParams.get('to') || ''
        const userId = searchParams.get('userId') || ''
        const targetId = searchParams.get('targetId') || ''
        const isExport = searchParams.get('export') === 'true'

        console.log(`🦖 Audit Logs API - Cursor: ${cursor ? cursor.substring(0, 10) + '...' : 'none'}, ChunkSize: ${chunkSize}, UseChunking: ${useChunking}`);

        // Build where clause for filtering
        const where: WhereClause = {}

        // Date range filter
        if (from || to) {
            where.createdAt = {}
            if (from) {
                const fromDate = new Date(from);
                if (!isNaN(fromDate.getTime())) {
                    where.createdAt.gte = fromDate;
                    console.log('🦖 Date filter FROM:', fromDate.toISOString());
                }
            }
            if (to) {
                const toDate = new Date(to);
                if (!isNaN(toDate.getTime())) {
                    where.createdAt.lte = toDate;
                    console.log('🦖 Date filter TO:', toDate.toISOString());
                }
            }
        }

        // Action filter
        if (action) {
            where.action = action
            console.log('🦖 Action filter:', action);
        }

        // User ID filters
        if (userId) where.userId = userId
        if (targetId) where.targetUserId = targetId

        // Search filter - includes preserved user data
        if (search) {
            where.OR = [
                {
                    user: {
                        OR: [
                            {name: {contains: search, mode: 'insensitive'}},
                            {email: {contains: search, mode: 'insensitive'}}
                        ]
                    }
                },
                {
                    targetUser: {
                        OR: [
                            {name: {contains: search, mode: 'insensitive'}},
                            {email: {contains: search, mode: 'insensitive'}}
                        ]
                    }
                },
                {action: {contains: search, mode: 'insensitive'}},
                // Search in preserved user data
                {
                    details: {
                        path: ['_preservedUser', 'email'],
                        string_contains: search
                    }
                },
                {
                    details: {
                        path: ['_preservedUser', 'name'],
                        string_contains: search
                    }
                },
                {
                    details: {
                        path: ['_preservedTargetUser', 'email'],
                        string_contains: search
                    }
                },
                {
                    details: {
                        path: ['_preservedTargetUser', 'name'],
                        string_contains: search
                    }
                }
            ]
            console.log('🦖 Search filter applied:', search);
        }

        // If exporting, return all matching records as CSV
        if (isExport) {
            const logs = await db.auditLog.findMany({
                where,
                orderBy: {createdAt: 'desc'},
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
            }) as DatabaseAuditLog[]

            const csvContent = convertLogsToCSV(logs);

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
                }
            }) as NextResponse<AuditLogsResponse | { error: string }>
        }

        // Get total count for pagination
        const total = await db.auditLog.count({where})
        console.log(`🦖 Total audit logs matching filters: ${total}`);

        // Determine fetching method: chunking or pagination
        if (useChunking) {
            let logs: DatabaseAuditLog[];

            if (cursor) {
                console.log(`🦖 Using cursor-based fetch with cursor: ${cursor.substring(0, 10)}...`);

                // Get the cursor record to understand its position
                const cursorRecord = await db.auditLog.findUnique({
                    where: {id: cursor},
                    select: {createdAt: true, id: true}
                });

                if (!cursorRecord) {
                    // If cursor doesn't exist, fall back to initial fetch
                    console.log('🦖 Cursor not found, falling back to initial fetch');
                    logs = await db.auditLog.findMany({
                        where,
                        take: chunkSize,
                        orderBy: [
                            {createdAt: 'desc'},
                            {id: 'desc'}
                        ],
                        include: {
                            user: {select: {name: true, email: true}},
                            targetUser: {select: {name: true, email: true}}
                        }
                    }) as DatabaseAuditLog[]
                } else {
                    // Get records before this cursor (older records in desc order)
                    logs = await db.auditLog.findMany({
                        where: {
                            ...where,
                            OR: [
                                {
                                    createdAt: {
                                        lt: cursorRecord.createdAt
                                    }
                                },
                                {
                                    createdAt: cursorRecord.createdAt,
                                    id: {
                                        lt: cursor
                                    }
                                }
                            ]
                        },
                        take: chunkSize,
                        orderBy: [
                            {createdAt: 'desc'},
                            {id: 'desc'}
                        ],
                        include: {
                            user: {select: {name: true, email: true}},
                            targetUser: {select: {name: true, email: true}}
                        }
                    }) as DatabaseAuditLog[]
                }
            } else {
                console.log(`🦖 Initial fetch without cursor`);
                // Initial fetch without cursor
                logs = await db.auditLog.findMany({
                    where,
                    take: chunkSize,
                    orderBy: [
                        {createdAt: 'desc'},
                        {id: 'desc'}
                    ],
                    include: {
                        user: {select: {name: true, email: true}},
                        targetUser: {select: {name: true, email: true}}
                    }
                }) as DatabaseAuditLog[]
            }

            console.log(`🦖 Fetched ${logs.length} logs`);

            // Process logs to include preserved user info
            const processedLogs = processLogs(logs);

            // Determine next cursor and hasMore
            const nextCursor = logs.length === chunkSize && logs.length > 0 ? logs[logs.length - 1].id : null;
            const hasMore = logs.length === chunkSize;

            console.log(`🦖 NextCursor: ${nextCursor ? nextCursor.substring(0, 10) + '...' : 'none'}, HasMore: ${hasMore}`);

            return NextResponse.json({
                logs: processedLogs,
                total,
                pages: Math.ceil(total / chunkSize),
                nextCursor,
                hasMore,
                currentCount: logs.length
            })
        } else {
            // Standard pagination
            const skip = (page - 1) * pageSize

            const logs = await db.auditLog.findMany({
                where,
                take: pageSize,
                skip,
                orderBy: [
                    {createdAt: 'desc'},
                    {id: 'desc'}
                ],
                include: {
                    user: {select: {name: true, email: true}},
                    targetUser: {select: {name: true, email: true}}
                }
            }) as DatabaseAuditLog[]

            // Process logs to include preserved user info
            const processedLogs = processLogs(logs);

            return NextResponse.json({
                logs: processedLogs,
                total,
                pages: Math.ceil(total / pageSize),
                nextCursor: null,
                hasMore: skip + pageSize < total,
                currentCount: logs.length
            })
        }
    } catch (error) {
        console.error('🦖 Audit logs fetch error:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch audit logs',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            {status: 500}
        )
    }
}