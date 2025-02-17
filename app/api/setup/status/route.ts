import { NextResponse } from "next/server"
import {db} from "@/lib/db";

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