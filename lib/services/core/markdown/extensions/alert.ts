import {Extension} from '../types';

interface AlertTypeConfig {
    icon: string;
    classes: string;
}

export const AlertExtension: Extension = {
    name: 'alert',
    parseRules: [
        {
            name: 'alert',
            pattern: /:::(\w+)(?:\s+(.*?))?\s*\n([\s\S]*?)\n:::/, // REMOVED the 'g' flag
            render: (match: RegExpMatchArray) => {
                console.log('Alert match found:', match);
                return {
                    type: 'alert',
                    content: match[3].trim(),
                    raw: match[0],
                    attributes: {
                        type: match[1],
                        title: match[2] || ''
                    }
                };
            }
        }
    ],
    renderRules: [
        {
            type: 'alert',
            render: (token: { content: string; attributes?: { type?: string; title?: string } }) => {
                const type = token.attributes?.type || 'info';
                const title = token.attributes?.title || '';

                const typeConfig: Record<string, AlertTypeConfig> = {
                    info: {
                        icon: 'ℹ️',
                        classes: 'bg-blue-500/10 border-blue-500/30 text-blue-600 border-l-blue-500'
                    },
                    warning: {
                        icon: '⚠️',
                        classes: 'bg-amber-500/10 border-amber-500/30 text-amber-600 border-l-amber-500'
                    },
                    error: {
                        icon: '❌',
                        classes: 'bg-red-500/10 border-red-500/30 text-red-600 border-l-red-500'
                    },
                    success: {
                        icon: '✅',
                        classes: 'bg-green-500/10 border-green-500/30 text-green-600 border-l-green-500'
                    },
                    tip: {
                        icon: '💡',
                        classes: 'bg-purple-500/10 border-purple-500/30 text-purple-600 border-l-purple-500'
                    },
                    note: {
                        icon: '📝',
                        classes: 'bg-gray-500/10 border-gray-500/30 text-gray-600 border-l-gray-500'
                    }
                };

                const config = typeConfig[type] || typeConfig.info;
                const baseClasses = 'border-l-4 p-4 mb-4 rounded-md transition-colors duration-200';
                const classes = `${baseClasses} ${config.classes}`;

                const titleHtml = title
                    ? `<div class="font-medium mb-2 flex items-center gap-2">
                         <span class="text-lg" role="img" aria-label="${type}">${config.icon}</span>
                         <span>${title}</span>
                       </div>`
                    : `<div class="font-medium mb-2 flex items-center gap-2">
                         <span class="text-lg" role="img" aria-label="${type}">${config.icon}</span>
                         <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                       </div>`;

                return `<div class="${classes}" role="alert" aria-live="polite">
                          ${titleHtml}
                          <div class="leading-relaxed">${token.content}</div>
                        </div>`;
            }
        }
    ]
};

// Usage examples:
// :::info Important Information
// This is some important information that users should know about.
// :::
//
// :::warning
// Be careful when running this command!
// :::
//
// :::error Database Connection Failed
// Unable to connect to the database. Please check your configuration.
// :::
//
// :::success Task Completed
// Your operation has been completed successfully!
// :::
//
// :::tip Pro Tip
// You can use keyboard shortcuts to speed up your workflow.
// :::
//
// :::note
// This is a general note with neutral styling.
// :::