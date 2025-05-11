/**
 * Secton API Integration
 * Provides utilities for interacting with the Secton AI service
 */

import { AIModel, AIMessage, CompletionRequest, CompletionResponse, AIError } from './types';

/**
 * Configuration for Secton API
 */
export interface SectonConfig {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<SectonConfig> = {
    baseUrl: 'https://api.secton.org/v1',
    defaultModel: 'copilot-zero',
};

/**
 * Secton API Client
 */
export class SectonClient {
    private config: SectonConfig;

    constructor(config: SectonConfig) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };
    }

    /**
     * Get available models from the API
     */
    async getModels(): Promise<AIModel[]> {
        try {
            const response = await fetch(`${this.config.baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new AIError('Failed to fetch models', response.status, error);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof AIError) {
                throw error;
            }
            throw new AIError('Failed to fetch models', 500, error);
        }
    }

    /**
     * Generate a completion using the chat API
     */
    async createCompletion(request: Partial<CompletionRequest>): Promise<CompletionResponse> {
        try {
            const completionRequest: CompletionRequest = {
                model: request.model || this.config.defaultModel || 'copilot-zero',
                messages: request.messages || [],
                temperature: request.temperature ?? 0.7,
                max_tokens: request.max_tokens ?? 1024,
            };

            // Log the outgoing request body
            console.log('AI Request:', JSON.stringify(completionRequest, null, 2));

            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify(completionRequest),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('AI Error Response:', error);
                throw new AIError('Failed to create completion', response.status, error);
            }

            // Parse the JSON response
            const jsonResponse = await response.json();

            // // Log the complete response
            // console.log('AI Response:', JSON.stringify(jsonResponse, null, 2));

            return jsonResponse;
        } catch (error) {
            console.error('AI Completion Error:', error);
            if (error instanceof AIError) {
                throw error;
            }
            throw new AIError('Failed to create completion', 500, error);
        }
    }

    /**
     * Helper to quickly generate text from a prompt
     */
    async generateText(prompt: string, options: Partial<CompletionRequest> = {}): Promise<string> {
        const messages: AIMessage[] = [
            { role: 'user', content: prompt }
        ];

        const completion = await this.createCompletion({
            ...options,
            messages,
        });

        return completion.messages[completion.messages.length - 1]?.content || '';
    }

    /**
     * Check if the API key is valid by fetching models
     */
    async validateApiKey(): Promise<boolean> {
        try {
            await this.getModels();
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Create a new Secton client
 */
export function createSectonClient(config: SectonConfig): SectonClient {
    return new SectonClient(config);
}