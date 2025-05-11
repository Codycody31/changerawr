/**
 * Template prompts for AI completions in the markdown editor
 * Optimized for predictable, consistent responses
 */
import { AICompletionType, AIEditorRequest, AIMessage } from './types';

/**
 * System messages for different completion types
 */
export const SYSTEM_MESSAGES: Record<AICompletionType, string> = {
    [AICompletionType.COMPLETE]:
        "You are a helpful writing assistant. Complete the text in a natural way that maintains the style, tone, and context of the original content. Only generate the completion text. Do not repeat any of the original content.",

    [AICompletionType.EXPAND]:
        "You are a helpful writing assistant. Expand on the given content by adding more details, examples, explanations, or ideas. Maintain the original style and tone. Only generate the expanded text, leaving the original intact.",

    [AICompletionType.IMPROVE]:
        "You are a helpful writing assistant. Improve the given text by enhancing clarity, flow, and style. Make it more engaging and professional while preserving the meaning. Return the complete improved version of the text.",

    [AICompletionType.SUMMARIZE]:
        "You are a helpful writing assistant. Summarize the given content concisely while preserving key points and main ideas. Return only the summary.",

    [AICompletionType.REPHRASE]:
        "You are a helpful writing assistant. Rephrase the given text to convey the same meaning using different wording and sentence structure. Return only the rephrased version.",

    [AICompletionType.FIX_GRAMMAR]:
        "You are a helpful writing assistant. Fix grammar, spelling, and punctuation errors in the text without changing its meaning or style. Return only the corrected text.",

    [AICompletionType.CUSTOM]:
        "You are a helpful writing assistant. Follow the specific instructions to process the provided content. Only return the processed text as specified, with no explanations, questions, or additional comments."
};

/**
 * Generate a prompt based on the editor request with guardrails
 * for predictable responses
 */
export function generatePrompt(request: AIEditorRequest): string {
    // Guard against empty content
    const content = request.content?.trim() || "";
    const isEmpty = content.length === 0;

    switch (request.type) {
        case AICompletionType.COMPLETE:
            if (isEmpty) return "Please provide some text to complete.";
            return [
                `Please continue the following text:`,
                `"""`,
                `${content}`,
                `"""`,
                `Continue directly from where it ends. Return only the new content with no additional context, explanations, or preamble.`
            ].join('\n');

        case AICompletionType.EXPAND:
            if (isEmpty) return "Please provide content to expand upon.";
            return [
                `Please expand on the following text with more details, examples, or explanations:`,
                `"""`,
                `${content}`,
                `"""`,
                `Return the expanded version of the text with no additional context, explanations, or preamble.`
            ].join('\n');

        case AICompletionType.IMPROVE:
            if (isEmpty) return "Please provide content to improve.";
            return [
                `Please improve the following text by enhancing clarity, flow, and style:`,
                `"""`,
                `${content}`,
                `"""`,
                `Return the improved version of the text with no additional context, explanations, or preamble.`
            ].join('\n');

        case AICompletionType.SUMMARIZE:
            if (isEmpty) return "Please provide content to summarize.";
            return [
                `Please summarize the following content while preserving the key points:`,
                `"""`,
                `${content}`,
                `"""`,
                `Return only the summary with no additional context, explanations, or preamble.`
            ].join('\n');

        case AICompletionType.REPHRASE:
            if (isEmpty) return "Please provide content to rephrase.";
            return [
                `Please rephrase the following text while preserving its meaning:`,
                `"""`,
                `${content}`,
                `"""`,
                `Return only the rephrased text with no additional context, explanations, or preamble.`
            ].join('\n');

        case AICompletionType.FIX_GRAMMAR:
            if (isEmpty) return "Please provide content to fix grammar.";
            return [
                `Please correct any grammar, spelling, and punctuation errors in the following text:`,
                `"""`,
                `${content}`,
                `"""`,
                `Return only the corrected text with no additional context, explanations, or preamble.`
            ].join('\n');

        case AICompletionType.CUSTOM:
            if (!request.customPrompt) {
                return `Please provide specific instructions for how to process the text.`;
            }

            return [
                `${request.customPrompt}`,
                ``,
                `Here is the content to work with:`,
                `"""`,
                `${isEmpty ? "(No content provided)" : content}`,
                `"""`,
                `Return only the processed text with no additional context, explanations, or preamble.`
            ].join('\n');

        default:
            return isEmpty ? "Please provide some content." : content;
    }
}

/**
 * Get system and user messages for a completion request
 */
export function getMessagesForRequest(request: AIEditorRequest): AIMessage[] {
    return [
        {
            role: 'system',
            content: SYSTEM_MESSAGES[request.type]
        },
        {
            role: 'user',
            content: generatePrompt(request)
        }
    ];
}

/**
 * Get a descriptive label for an AI completion type
 */
export function getCompletionTypeLabel(type: AICompletionType): string {
    switch (type) {
        case AICompletionType.COMPLETE:
            return 'Continue Writing';
        case AICompletionType.EXPAND:
            return 'Expand Content';
        case AICompletionType.IMPROVE:
            return 'Improve Writing';
        case AICompletionType.SUMMARIZE:
            return 'Summarize';
        case AICompletionType.REPHRASE:
            return 'Rephrase';
        case AICompletionType.FIX_GRAMMAR:
            return 'Fix Grammar';
        case AICompletionType.CUSTOM:
            return 'Custom Instruction';
        default:
            return 'AI Assistant';
    }
}

/**
 * Get a description for an AI completion type
 */
export function getCompletionTypeDescription(type: AICompletionType): string {
    switch (type) {
        case AICompletionType.COMPLETE:
            return 'Continue writing from where you left off';
        case AICompletionType.EXPAND:
            return 'Add more details, examples, or explanations';
        case AICompletionType.IMPROVE:
            return 'Enhance clarity, flow, and style';
        case AICompletionType.SUMMARIZE:
            return 'Create a concise summary of the text';
        case AICompletionType.REPHRASE:
            return 'Rewrite with different wording';
        case AICompletionType.FIX_GRAMMAR:
            return 'Fix grammar, spelling, and punctuation';
        case AICompletionType.CUSTOM:
            return 'Write your own instructions';
        default:
            return '';
    }
}