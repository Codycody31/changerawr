import {NextResponse} from 'next/server';
import {validateAuthAndGetUser} from '@/lib/utils/changelog';
import {db} from '@/lib/db';

interface ConnectionResponse {
    id: string;
    providerId: string;
    provider: {
        id: string;
        name: string;
        enabled: boolean;
        isDefault: boolean;
    };
    providerUserId: string;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface UserConnectionsResponse {
    connections: ConnectionResponse[];
    allProviders: {
        id: string;
        name: string;
        enabled: boolean;
        isDefault: boolean;
    }[];
}

/**
 * @method GET
 * @description Retrieves user's OAuth connections and available providers
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "connections": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "providerId": { "type": "string" },
 *           "provider": {
 *             "type": "object",
 *             "properties": {
 *               "id": { "type": "string" },
 *               "name": { "type": "string" },
 *               "enabled": { "type": "boolean" },
 *               "isDefault": { "type": "boolean" }
 *             }
 *           },
 *           "providerUserId": { "type": "string" },
 *           "expiresAt": { "type": "string", "nullable": true },
 *           "createdAt": { "type": "string" },
 *           "updatedAt": { "type": "string" }
 *         }
 *       }
 *     },
 *     "allProviders": {
 *       "type": "array",
 *       "items": {
 *         "type": "object",
 *         "properties": {
 *           "id": { "type": "string" },
 *           "name": { "type": "string" },
 *           "enabled": { "type": "boolean" },
 *           "isDefault": { "type": "boolean" }
 *         }
 *       }
 *     }
 *   }
 * }
 * @error 401 Unauthorized - User not authenticated
 * @error 500 Internal server error - Database query failed
 * @secure
 */
export async function GET() {
    try {
        // Validate authentication
        const user = await validateAuthAndGetUser();

        // Fetch user's OAuth connections with provider details
        const connections = await db.oAuthConnection.findMany({
            where: {
                userId: user.id
            },
            include: {
                provider: {
                    select: {
                        id: true,
                        name: true,
                        enabled: true,
                        isDefault: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Fetch all available providers for comparison
        const allProviders = await db.oAuthProvider.findMany({
            select: {
                id: true,
                name: true,
                enabled: true,
                isDefault: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Transform connections to match the expected format
        const transformedConnections: ConnectionResponse[] = connections.map(connection => ({
            id: connection.id,
            providerId: connection.providerId,
            provider: connection.provider,
            providerUserId: connection.providerUserId,
            expiresAt: connection.expiresAt ? connection.expiresAt.toISOString() : null,
            createdAt: connection.createdAt.toISOString(),
            updatedAt: connection.updatedAt.toISOString()
        }));

        const response: UserConnectionsResponse = {
            connections: transformedConnections,
            allProviders
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Failed to fetch user OAuth connections:', error);

        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json(
                {error: 'Unauthorized'},
                {status: 401}
            );
        }

        return NextResponse.json(
            {error: 'Failed to fetch OAuth connections'},
            {status: 500}
        );
    }
}