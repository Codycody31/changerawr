import { useState, useCallback, useRef } from 'react';
import {
    AICompletionType,
    CompletionRequest,
    AIEditorRequest,
    AIEditorResult
} from '@/lib/utils/ai/types';
import { SectonClient } from '@/lib/utils/ai/secton';
import { getMessagesForRequest } from '@/lib/utils/ai/prompts';

export interface AIAssistantState {
    isVisible: boolean;
    isLoading: boolean;
    completionType: AICompletionType;
    customPrompt: string;
    error: Error | null;
    lastResult: AIEditorResult | null;
    apiKeyValid: boolean | null;
}

export interface UseAIAssistantOptions {
    apiKey?: string;
    defaultModel?: string;
    onGenerated?: (result: AIEditorResult) => void;
}

/**
 * Hook for managing AI assistant functionality
 */
export function useAIAssistant(options: UseAIAssistantOptions = {}) {
    // Client and configuration
    const clientRef = useRef<SectonClient | null>(null);

    // Panel state
    const [state, setState] = useState<AIAssistantState>({
        isVisible: false,
        isLoading: false,
        completionType: AICompletionType.COMPLETE,
        customPrompt: '',
        error: null,
        lastResult: null,
        apiKeyValid: null,
    });

    /**
     * Initialize or update the Secton client
     */
    const initializeClient = useCallback(async (apiKey: string) => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            // Create a new client
            const client = new SectonClient({
                apiKey,
                defaultModel: options.defaultModel || 'copilot-zero',
            });

            // Test if the API key is valid
            const isValid = await client.validateApiKey();

            clientRef.current = client;
            setState(prev => ({
                ...prev,
                isLoading: false,
                apiKeyValid: isValid,
                error: isValid ? null : new Error('Invalid API key')
            }));

            return isValid;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                apiKeyValid: false,
                error: error instanceof Error ? error : new Error('Failed to initialize AI client')
            }));
            return false;
        }
    }, [options.defaultModel]);

    /**
     * Set the API key
     */
    const setApiKey = useCallback(async (apiKey: string) => {
        if (apiKey && apiKey.trim() !== '') {
            return await initializeClient(apiKey);
        }

        clientRef.current = null;
        setState(prev => ({ ...prev, apiKeyValid: false }));
        return false;
    }, [initializeClient]);

    /**
     * Open the AI assistant panel
     */
    const openAssistant = useCallback((type: AICompletionType = AICompletionType.COMPLETE) => {
        setState(prev => ({
            ...prev,
            isVisible: true,
            completionType: type
        }));
    }, []);

    /**
     * Close the AI assistant panel
     */
    const closeAssistant = useCallback(() => {
        setState(prev => ({ ...prev, isVisible: false }));
    }, []);

    /**
     * Set the completion type
     */
    const setCompletionType = useCallback((type: AICompletionType) => {
        setState(prev => ({ ...prev, completionType: type }));
    }, []);

    /**
     * Set the custom prompt
     */
    const setCustomPrompt = useCallback((prompt: string) => {
        setState(prev => ({ ...prev, customPrompt: prompt }));
    }, []);

    /**
     * Generate a completion
     */
    const generateCompletion = useCallback(async (request: AIEditorRequest): Promise<AIEditorResult | null> => {
        // If client is not initialized or API key is invalid, return null
        if (!clientRef.current || state.apiKeyValid !== true) {
            setState(prev => ({
                ...prev,
                error: new Error('AI client not initialized or API key invalid'),
                isLoading: false
            }));
            return null;
        }

        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            // If the completion type is custom, use the custom prompt
            const finalRequest: AIEditorRequest = {
                ...request,
                customPrompt: request.type === AICompletionType.CUSTOM
                    ? (request.customPrompt || state.customPrompt)
                    : request.customPrompt
            };

            // Get messages for the request
            const messages = getMessagesForRequest(finalRequest);

            // Build completion request
            const completionRequest: Partial<CompletionRequest> = {
                ...finalRequest.options,
                messages,
            };

            // Call the API
            const response = await clientRef.current.createCompletion(completionRequest);

            // Extract the result
            const result: AIEditorResult = {
                text: response.messages[1]?.content || '',
                originalRequest: finalRequest,
                usage: response.usage,
                metadata: {
                    model: response.model,
                    timestamp: Date.now(),
                }
            };

            // Update state
            setState(prev => ({
                ...prev,
                isLoading: false,
                lastResult: result
            }));

            // Trigger callback
            options.onGenerated?.(result);

            return result;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error : new Error('Failed to generate completion')
            }));
            return null;
        }
    }, [state.apiKeyValid, state.customPrompt, options.onGenerated]);

    /**
     * Clear the last result
     */
    const clearLastResult = useCallback(() => {
        setState(prev => ({ ...prev, lastResult: null }));
    }, []);

    return {
        state,
        setApiKey,
        openAssistant,
        closeAssistant,
        setCompletionType,
        setCustomPrompt,
        generateCompletion,
        clearLastResult,
    };
}

export default useAIAssistant;