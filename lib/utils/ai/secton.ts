/**
 * Secton API Integration
 * Provides utilities for interacting with the Secton AI service
 */

import {AIError, AIMessage, AIModel, CompletionRequest, CompletionResponse} from './types';

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

        console.log('SectonClient initialized:', {
            baseUrl: this.config.baseUrl,
            defaultModel: this.config.defaultModel,
            hasApiKey: !!this.config.apiKey,
            apiKeyPrefix: this.config.apiKey ? this.config.apiKey.substring(0, 8) + '...' : 'none'
        });
    }

    /**
     * Get available models from the API
     */
    async getModels(): Promise<AIModel[]> {
        // console.log('Fetching available models...');

        try {
            const url = `${this.config.baseUrl}/models`;
            // console.log('Models request URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            // console.log('📡 Models response status:', response.status, response.statusText);
            // console.log('📡 Models response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Models API error response:', errorText);

                let error;
                try {
                    error = JSON.parse(errorText);
                } catch {
                    error = {message: errorText};
                }

                throw new AIError('Failed to fetch models', response.status, error);
            }

            const models = await response.json();
            // console.log('✅ Models fetched successfully:', models);
            return models;
        } catch (error) {
            console.error('💥 Models fetch error:', error);
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
        // console.log('🚀 Starting completion request...');
        // console.log('📝 Input request:', JSON.stringify(request, null, 2));

        try {
            const completionRequest: CompletionRequest = {
                model: request.model || this.config.defaultModel || 'copilot-zero',
                messages: request.messages || [],
                temperature: request.temperature ?? 0.7,
                max_tokens: request.max_tokens ?? 1024,
            };

            // console.log('📋 Final completion request:', JSON.stringify(completionRequest, null, 2));
            // console.log('🔑 API Key being used:', this.config.apiKey ? this.config.apiKey.substring(0, 8) + '...' : 'none');

            const url = `${this.config.baseUrl}/chat/completions`;
            console.log('📡 Request URL:', url);

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
                'User-Agent': 'Changerawr/1.0',
            };
            // console.log('📋 Request headers:', {
            //     ...headers,
            //     'Authorization': headers.Authorization ? headers.Authorization.substring(0, 20) + '...' : 'none'
            // });

            const requestBody = JSON.stringify(completionRequest);
            // console.log('📦 Request body size:', requestBody.length, 'characters');

            // console.log('📡 Making fetch request...');
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: requestBody,
            });

            // console.log('📡 Response received - Status:', response.status, response.statusText);
            // console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                console.error('❌ Response not OK, reading error...');
                const errorText = await response.text();
                console.error('❌ Error response text:', errorText);

                let error;
                try {
                    error = JSON.parse(errorText);
                    console.error('❌ Parsed error object:', error);
                } catch (parseError) {
                    console.error('❌ Failed to parse error as JSON:', parseError);
                    error = {message: errorText};
                }

                throw new AIError('Failed to create completion', response.status, error);
            }

            // console.log('📖 Reading response body...');
            const responseText = await response.text();
            // console.log('📄 Raw response text length:', responseText.length);
            // console.log('📄 Raw response preview (first 500 chars):', responseText.substring(0, 500));

            let jsonResponse;
            try {
                // console.log('🔄 Parsing JSON response...');
                jsonResponse = JSON.parse(responseText);
                // console.log('✅ JSON parsed successfully');
                // console.log('📋 Response structure:', {
                //     hasObject: 'object' in jsonResponse,
                //     hasModel: 'model' in jsonResponse,
                //     hasMessages: 'messages' in jsonResponse,
                //     hasUsage: 'usage' in jsonResponse,
                //     keys: Object.keys(jsonResponse)
                // });
            } catch (parseError) {
                console.error('💥 Failed to parse JSON response:', parseError);
                console.error('💥 Response text that failed to parse:', responseText);
                throw new AIError('Invalid JSON response from AI service', 500, {
                    originalError: parseError,
                    responseText: responseText.substring(0, 1000)
                });
            }

            // Log the complete response structure
            console.log('📋 Complete response object:', JSON.stringify(jsonResponse, null, 2));

            // Validate response structure
            if (!jsonResponse.messages || !Array.isArray(jsonResponse.messages)) {
                console.error('❌ Invalid response structure - missing or invalid messages array');
                console.error('❌ Response keys:', Object.keys(jsonResponse));
                throw new AIError('Invalid response structure from AI service', 500, jsonResponse);
            }

            // console.log('✅ Completion successful!');
            // console.log('📊 Response summary:', {
            //     model: jsonResponse.model,
            //     messageCount: jsonResponse.messages?.length,
            //     hasUsage: !!jsonResponse.usage,
            //     totalTokens: jsonResponse.usage?.total_tokens
            // });

            return jsonResponse as CompletionResponse;
        } catch (error) {
            console.error('💥 AI Completion Error Details:');
            console.error('💥 Error type:', typeof error);
            console.error('💥 Error constructor:', error?.constructor?.name);
            console.error('💥 Error message:', error instanceof Error ? error.message : 'Unknown error');
            console.error('💥 Full error object:', error);

            if (error instanceof AIError) {
                console.error('💥 AIError details:', {
                    message: error.message,
                    statusCode: error.statusCode,
                    details: error.details
                });
                throw error;
            }

            if (error instanceof Error) {
                throw new AIError('Failed to create completion', 500, {
                    originalMessage: error.message,
                    originalStack: error.stack,
                    originalError: error
                });
            }

            throw new AIError('Unknown error during completion', 500, error);
        }
    }

    /**
     * Helper to quickly generate text from a prompt
     */
    async generateText(prompt: string, options: Partial<CompletionRequest> = {}): Promise<string> {
        // console.log('📝 generateText called with prompt length:', prompt.length);
        // console.log('📝 generateText options:', options);

        const messages: AIMessage[] = [
            {role: 'user', content: prompt}
        ];

        // console.log('📝 Constructed messages:', messages);

        const completion = await this.createCompletion({
            ...options,
            messages,
        });

        // console.log('📝 Completion response received');
        // console.log('📝 Response messages:', completion.messages);

        // Find the assistant's response
        const assistantMessage = completion.messages.find(m => m.role === 'assistant');
        // console.log('📝 Assistant message found:', !!assistantMessage);

        if (!assistantMessage) {
            console.error('❌ No assistant message in response');
            console.error('❌ Available messages:', completion.messages.map(m => ({
                role: m.role,
                contentLength: m.content?.length
            })));
            throw new AIError('No assistant response found', 500, completion);
        }

        const result = assistantMessage.content || '';
        // console.log('✅ generateText result length:', result.length);
        // console.log('✅ generateText result preview:', result.substring(0, 200) + (result.length > 200 ? '...' : ''));

        return result;
    }

    /**
     * Check if the API key is valid by fetching models
     */
    async validateApiKey(): Promise<boolean> {
        // console.log('🔑 Validating API key...');

        try {
            await this.getModels();
            // console.log('✅ API key validation successful');
            return true;
        } catch (error) {
            console.error('❌ API key validation failed:', error);
            return false;
        }
    }
}

/**
 * Create a new Secton client
 */
export function createSectonClient(config: SectonConfig): SectonClient {
    console.log('Creating new SectonClient with config:', {
        ...config,
        apiKey: config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'none'
    });

    return new SectonClient(config);
}