import { NextResponse } from 'next/server'
import { validateAuthAndGetUser } from '@/lib/utils/changelog'
import { PrismaClient } from '@prisma/client'
import { createSectonClient } from '@/lib/utils/ai/secton'
import { createOpenAIClient } from '@/lib/utils/ai/openai'
import { AIMessage, CompletionRequest } from '@/lib/utils/ai/types'

const prisma = new PrismaClient()

interface CompletionBody {
  messages: AIMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
}

export async function POST(request: Request) {
  try {
    // Ensure the requester is authenticated (logged in user)
    const user = await validateAuthAndGetUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CompletionBody = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Fetch system AI settings
    const config = await prisma.systemConfig.findFirst({
      where: { id: 1 },
      select: {
        enableAIAssistant: true,
        aiApiKey: true,
        aiDefaultModel: true,
        aiApiProvider: true,
        // @ts-ignore pending prisma types
        aiApiBaseUrl: true,
      },
    })

    if (!config?.enableAIAssistant || !config.aiApiKey) {
      return NextResponse.json({ error: 'AI assistant not configured' }, { status: 400 })
    }

    // Determine provider and client
    const provider = (config.aiApiProvider as 'secton' | 'openai') || 'secton'
    const baseUrl = (config as any).aiApiBaseUrl || undefined
    const model = body.model || config.aiDefaultModel || (provider === 'openai' ? 'gpt-3.5-turbo' : 'copilot-zero')

    const commonRequest: Partial<CompletionRequest> = {
      model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    }

    let completion
    if (provider === 'openai') {
      const client = createOpenAIClient({
        apiKey: config.aiApiKey,
        baseUrl,
        defaultModel: config.aiDefaultModel || 'gpt-3.5-turbo',
      })
      completion = await client.createCompletion(commonRequest)
    } else {
      const client = createSectonClient({
        apiKey: config.aiApiKey,
        baseUrl,
        defaultModel: config.aiDefaultModel || 'copilot-zero',
      })
      completion = await client.createCompletion(commonRequest)
    }

    return NextResponse.json(completion)
  } catch (err) {
    console.error('AI completion route error:', err)
    return NextResponse.json({ error: 'Server error while generating completion' }, { status: 500 })
  }
} 