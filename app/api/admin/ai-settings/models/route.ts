import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'

const prisma = new PrismaClient()

/**
 * GET /api/admin/ai-settings/models?provider={secton|openai}
 * Returns available models for current AI provider using stored system credentials.
 */
export async function GET(request: Request) {
  try {
    const user = await validateAuthAndGetUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const providerParam = url.searchParams.get('provider') as 'secton' | 'openai' | null

    const config = await prisma.systemConfig.findFirst({
      where: { id: 1 },
      select: {
        aiApiKey: true,
        aiApiProvider: true,
        aiApiBaseUrl: true,
      }
    })

    const provider = providerParam || (config?.aiApiProvider as 'secton' | 'openai' | null) || 'secton'

    const apiKey = config?.aiApiKey
    if (!apiKey) return NextResponse.json({ error: 'AI API key not configured' }, { status: 400 })

    const baseUrl = (provider === 'openai'
      ? (config?.aiApiBaseUrl || 'https://api.openai.com/v1')
      : (config?.aiApiBaseUrl || 'https://api.secton.org/v1'))

    try {
      const res = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      })
      if (!res.ok) {
        const errText = await res.text()
        return NextResponse.json({ error: 'Failed to fetch models', details: errText }, { status: res.status })
      }
      const data = await res.json()
      const models = Array.isArray(data.data)
        ? data.data.map((m: any) => m.id)
        : Array.isArray(data)
          ? data.map((m: any) => m.id || m)
          : []

      return NextResponse.json({ models })
    } catch (err) {
      console.error('Fetch models error', err)
      return NextResponse.json({ error: 'Fetch models failed' }, { status: 500 })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 