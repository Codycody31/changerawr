/**
 * Type definitions for AI-related functionality
 */

// AI Completion types for editor integration
export enum AICompletionType {
    COMPLETE = 'complete',
    EXPAND = 'expand',
    IMPROVE = 'improve',
    SUMMARIZE = 'summarize',
    REPHRASE = 'rephrase',
    FIX_GRAMMAR = 'fix_grammar',
    CUSTOM = 'custom',
}

// AI Completion request from editor
export interface AIEditorRequest {
    type: AICompletionType;
    content: string;
    customPrompt?: string;
    selection?: {
        start: number;
        end: number;
        text: string;
    };
    options?: {
        temperature?: number;
        max_tokens?: number;
    };
}

// AI Completion result for editor
export interface AIEditorResult {
    text: string;
    originalRequest: AIEditorRequest;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    metadata?: {
        model: string;
        timestamp: number;
    };
}

// AI Message in a conversation
export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// Request to create a completion
export interface CompletionRequest {
    model: string;
    messages: AIMessage[];
    temperature?: number;
    max_tokens?: number;
}

// Response from the completion API
export interface CompletionResponse {
    object: string;
    model: string;
    messages: AIMessage[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// AI Model information
export interface AIModel {
    id: string;
    name?: string;
    provider?: string;
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