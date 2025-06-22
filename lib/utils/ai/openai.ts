import { AIError, AIMessage, CompletionRequest, CompletionResponse } from './types'

export interface OpenAIConfig {
    apiKey: string
    baseUrl?: string
    defaultModel?: string
}

const DEFAULT_CONFIG: Partial<OpenAIConfig> = {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
}

export class OpenAIClient {
    private config: OpenAIConfig

    constructor(config: OpenAIConfig) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        }
    }

    /**
     * Validate the supplied key by listing available models.
     */
    async validateApiKey(): Promise<boolean> {
        try {
            const res = await fetch(`${this.config.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
            })
            return res.ok
        } catch (e) {
            console.error('Error validating OpenAI API key:', e)
            return false
        }
    }

    /**
     * Perform a chat completion request. The response is transformed so that it matches CompletionResponse used in the codebase.
     */
    async createCompletion(request: Partial<CompletionRequest>): Promise<CompletionResponse> {
        const body = {
            model: request.model || this.config.defaultModel,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.max_tokens ?? 1024,
        }

        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            let errorJson: unknown = undefined
            try {
                errorJson = await response.json()
            } catch (e) {
                console.error('Failed to parse error response from OpenAI:', e)
            }
            throw new AIError('Failed to create completion', response.status, errorJson)
        }

        const json = await response.json()
        // Map OpenAI response -> CompletionResponse
        const assistantMessage = json.choices?.[0]?.message as { role: string; content: string } | undefined
        const usage = json.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

        const mapped: CompletionResponse = {
            object: json.object || 'chat.completion',
            model: json.model,
            messages: assistantMessage ? [{ role: assistantMessage.role as 'assistant', content: assistantMessage.content }] : [],
            usage,
        }
        return mapped
    }

    /**
     * Convenience wrapper similar to SectonClient
     */
    async generateText(prompt: string, options: Partial<CompletionRequest> = {}): Promise<string> {
        const messages: AIMessage[] = [
            { role: 'user', content: prompt },
        ]
        const response = await this.createCompletion({ ...options, messages })
        const assistant = response.messages.find(m => m.role === 'assistant')
        return assistant?.content || ''
    }
}

export function createOpenAIClient(config: OpenAIConfig): OpenAIClient {
    return new OpenAIClient(config)
} 