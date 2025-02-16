import { validateAuthAndGetUser } from "@/lib/utils/changelog";
import { NextResponse } from "next/server";
import {db} from "@/lib/db";

// Get all invitation links
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