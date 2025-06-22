import {NextRequest, NextResponse} from 'next/server'
import {validateAuthAndGetUser} from "@/lib/utils/changelog"
import {decryptToken} from "@/lib/utils/encryption"

interface DecryptRequest {
    encryptedToken: string
}

interface DecryptResponse {
    decryptedKey: string
}

interface DecryptErrorResponse {
    error: string
}

/**
 * @method POST
 * @description Decrypt an encrypted API key on the server side
 * @body {
 *   "type": "object",
 *   "properties": {
 *     "encryptedToken": { "type": "string" }
 *   },
 *   "required": ["encryptedToken"]
 * }
 * @response 200 {
 *   "type": "object",
 *   "properties": {
 *     "decryptedKey": { "type": "string" }
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<DecryptResponse | DecryptErrorResponse>> {
    try {
        await validateAuthAndGetUser()

        const body: DecryptRequest = await request.json()

        if (!body.encryptedToken) {
            return new NextResponse(
                JSON.stringify({error: 'Missing encrypted token'}),
                {status: 400}
            )
        }

        const decryptedKey = decryptToken(body.encryptedToken)

        return NextResponse.json({decryptedKey})
    } catch (error) {
        console.error('Error decrypting API key:', error)

        return new NextResponse(
            JSON.stringify({error: 'Failed to decrypt API key'}),
            {status: 500}
        )
    }
}