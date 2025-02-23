import { NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * @method GET
 * @description Checks if the initial setup has been completed by verifying if any users exist in the database
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "isComplete": {
 *       "type": "boolean",
 *       "description": "Indicates whether the setup has been completed (true if at least one user exists)"
 *     }
 *   }
 * }
 * @error 500 An unexpected error occurred while checking setup status
 */
export async function GET() {
    try {
        const userCount = await db.user.count()

        return NextResponse.json({
            isComplete: userCount > 0,
        })
    } catch (error) {
        console.error('Setup status check error:', error)

        return NextResponse.json(
            { error: 'Failed to check setup status' },
            { status: 500 }
        )
    }
}