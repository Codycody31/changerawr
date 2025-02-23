import { validateAuthAndGetUser } from "@/lib/utils/changelog";
import { NextResponse } from "next/server";
import {db} from "@/lib/db";

/**
 * Retrieves a list of all invitation links
 * @method GET
 * @description Retrieves a list of all invitation links in descending order by creation date. Requires admin permissions.
 * @body None
 * @response 200 {
 *   "type": "array",
 *   "items": {
 *     "type": "object",
 *     "properties": {
 *       "id": { "type": "string" },
 *       "token": { "type": "string" },
 *       "email": { "type": "string" },
 *       "role": { "type": "string" },
 *       "expiresAt": { "type": "string", "format": "date-time" },
 *       "usedAt": { "type": "string", "format": "date-time" },
 *       "createdAt": { "type": "string", "format": "date-time" },
 *       "updatedAt": { "type": "string", "format": "date-time" }
 *     }
 *   }
 * }
 * @error 401 {
 *   "type": "object",
 *   "properties": {
 *     "error": { "type": "string" }
 *   }
 * }
 */
export async function GET() {
    try {
        const [user] = await Promise.all([validateAuthAndGetUser()]);

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const invitations = await db.invitationLink.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(invitations);
    } catch (error) {
        console.error('Failed to fetch invitation links:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invitation links' },
            { status: 500 }
        );
    }
}