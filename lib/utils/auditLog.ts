import { db } from '@/lib/db';

/**
 * Creates an audit log entry
 * @param action The type of action performed
 * @param performedById ID of the user performing the action
 * @param targetUserId ID of the user the action is performed on
 * @param details Optional additional details about the action
 */
export async function createAuditLog(
    action: string,
    performedById: string,
    targetUserId: string,
    details?: unknown
) {
    try {
        let safeDetails: Record<string, unknown> = {};

        if (details && typeof details === 'object') {
            safeDetails = details as Record<string, unknown>;
        } else if (details !== undefined) {
            console.warn(
                `Audit log received invalid details type: ${typeof details}`,
                details
            );
        }

        await db.auditLog.create({
            data: {
                action,
                userId: performedById,
                targetUserId,
                details: JSON.stringify(safeDetails),
            },
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}
