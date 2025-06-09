import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

/**
 * @method GET
 * @description Fetches all unique audit log actions for filter dropdown
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "actions": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "action": { "type": "string" },
 *           "count": { "type": "number" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 403 Unauthorized - User does not have 'ADMIN' role
 * @error 500 An unexpected error occurred while fetching actions
 */
export async function GET() {
    try {
        // Validate admin access
        const user = await validateAuthAndGetUser()
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Get all unique actions with their counts
        const actionsWithCounts = await db.auditLog.groupBy({
            by: ['action'],
            _count: {
                action: true
            },
            orderBy: {
                _count: {
                    action: 'desc'
                }
            }
        })

        // Transform to desired format
        const actions = actionsWithCounts.map(item => ({
            action: item.action,
            count: item._count.action
        }))

        return NextResponse.json({ actions })
    } catch (error) {
        console.error('Error fetching audit log actions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch audit log actions' },
            { status: 500 }
        )
    }
}