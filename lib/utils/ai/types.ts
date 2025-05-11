/**
 * Type definitions for AI-related functionality
 */

/**
 * AI Model information
 */
export interface AIModel {
    id: string;
    name?: string;
    provider?: string;
    description?: string;
    created?: string;
    max_tokens?: number;
    pricing?: {
        input?: number;
        output?: number;
    };
}

/**
 * Message in a conversation
 */
export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Request to create a completion
 */
export interface CompletionRequest {
    model: string;
    messages: AIMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    presence_penalty?: number;
    frequency_penalty?: number;
    stop?: string[];
}

/**
 * Token usage information
 */
export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

/**
 * Response from the completion API
 */
export interface CompletionResponse {
    object: string;
    model: string;
    organization_id?: string;
    messages: AIMessage[];
    usage: TokenUsage;
}

/**
 * Custom error class for AI-related errors
 */
export class AIError extends Error {
    statusCode: number;
    details: unknown;

    constructor(message: string, statusCode: number, details?: unknown) {
        super(message);
        this.name = 'AIError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

/**
 * AI Completion types for editor integration
 */
export enum AICompletionType {
    COMPLETE = 'complete',
    EXPAND = 'expand',
    IMPROVE = 'improve',
    SUMMARIZE = 'summarize',
    CUSTOM = 'custom',
}

/**
 * AI Completion request from editor
 */
export interface AIEditorRequest {
    type: AICompletionType;
    content: string;
    customPrompt?: string;
    selection?: {
        start: number;
        end: number;
        text: string;
    };
    options?: Partial<CompletionRequest>;
}

/**
 * AI Completion result for editor
 */
export interface AIEditorResult {
    text: string;
    originalRequest: AIEditorRequest;
    usage?: TokenUsage;
    metadata?: {
        model: string;
        completionId?: string;
        timestamp: number;
    };
}