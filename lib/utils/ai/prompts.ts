/**
 * Template prompts for AI completions in the markdown editor
 */
import { AICompletionType, AIEditorRequest } from './types';

/**
 * System messages for different completion types
 */
export const SYSTEM_MESSAGES: Record<AICompletionType, string> = {
    [AICompletionType.COMPLETE]:
        "You are a helpful writing assistant. Complete the text naturally, maintaining the style, tone, and context of the original content.",

    [AICompletionType.EXPAND]:
        "You are a helpful writing assistant. Expand on the given content by adding more details, examples, explanations, or ideas, while maintaining the original style and tone.",

    [AICompletionType.IMPROVE]:
        "You are a helpful writing assistant. Improve the given text by enhancing clarity, flow, and style. Make it more engaging and professional while preserving the original meaning.",

    [AICompletionType.SUMMARIZE]:
        "You are a helpful writing assistant. Summarize the given content concisely while preserving the key points and main ideas.",

    [AICompletionType.CUSTOM]:
        "You are a helpful writing assistant. Follow the user's instructions precisely to modify or generate text based on the given content."
};

/**
 * Generate a prompt based on the editor request
 */
export function generatePrompt(request: AIEditorRequest): string {
    switch (request.type) {
        case AICompletionType.COMPLETE:
            return `${request.content}`;

        case AICompletionType.EXPAND:
            return `Please expand on the following content with more details, examples, or explanations:

${request.content}`;

        case AICompletionType.IMPROVE:
            return `Please improve the following content by enhancing clarity, flow, and style. Make it more engaging and professional:

${request.content}`;

        case AICompletionType.SUMMARIZE:
            return `Please summarize the following content while preserving the key points:

${request.content}`;

        case AICompletionType.CUSTOM:
            if (request.customPrompt) {
                return `${request.customPrompt}

Content:
${request.content}`;
            }
            return `Please provide instructions on how you'd like me to modify or generate text based on this content:

${request.content}`;

        default:
            return request.content;
    }
}

/**
 * Get system and user messages for a completion request
 */
export function getMessagesForRequest(request: AIEditorRequest) {
    return [
        {
            role: 'system' as const,
            content: SYSTEM_MESSAGES[request.type]
        },
        {
            role: 'user' as const,
            content: generatePrompt(request)
        }
    ];
}