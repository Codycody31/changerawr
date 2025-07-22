import { Extension } from '../types';

export const ButtonExtension: Extension = {
    name: 'button',
    parseRules: [
        {
            name: 'button',
            pattern: /\[button:([^\]]+)\]\(([^)]+)\)(?:\{([^}]+)\})?/,
            render: (match) => {
                const options = match[3] ? match[3].split(',').map(opt => opt.trim()) : [];

                return {
                    type: 'button',
                    content: match[1],
                    raw: match[0],
                    attributes: {
                        href: match[2],
                        style: options.find(opt =>
                            ['default', 'primary', 'secondary', 'success', 'danger', 'outline', 'ghost'].includes(opt)
                        ) || 'primary',
                        size: options.find(opt => ['sm', 'md', 'lg'].includes(opt)) || 'md',
                        disabled: String(options.includes('disabled')),
                        target: options.includes('self') ? '_self' : '_blank'
                    }
                }
            }
        }
    ],
    renderRules: [
        {
            type: 'button',
            render: (token) => {
                const href = token.attributes?.href || '#';
                const style = token.attributes?.style || 'primary';
                const size = token.attributes?.size || 'md';
                const disabled = token.attributes?.disabled === 'true';
                const target = token.attributes?.target || '_blank';

                // Base classes with optical border effect
                const baseClasses = `
                    inline-flex items-center justify-center font-medium rounded-lg 
                    transition-all duration-200 ease-out
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
                    transform hover:scale-[1.02] active:scale-[0.98]
                    shadow-sm hover:shadow-md active:shadow-sm
                    border border-transparent
                    relative overflow-hidden
                    before:absolute before:inset-0 before:rounded-lg
                    before:bg-gradient-to-br before:from-white/20 before:to-transparent
                    before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200
                `.replace(/\s+/g, ' ').trim();

                // Size classes
                const sizeClasses: Record<string, string> = {
                    sm: 'px-3 py-1.5 text-sm gap-1.5',
                    md: 'px-4 py-2 text-base gap-2',
                    lg: 'px-6 py-3 text-lg gap-2.5'
                };

                // Style classes with optical borders using box-shadow
                const styleClasses: Record<string, string> = {
                    default: `
                        bg-slate-600 text-white border-slate-500
                        hover:bg-slate-700 hover:border-slate-400
                        focus:ring-slate-500
                        shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_1px_2px_0_rgba(0,0,0,0.1)]
                        hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_2px_4px_0_rgba(0,0,0,0.15)]
                    `,
                    primary: `
                        bg-blue-600 text-white border-blue-500
                        hover:bg-blue-700 hover:border-blue-400
                        focus:ring-blue-500
                        shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_1px_2px_0_rgba(0,0,0,0.1)]
                        hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_2px_4px_0_rgba(0,0,0,0.15)]
                    `,
                    secondary: `
                        bg-gray-600 text-white border-gray-500
                        hover:bg-gray-700 hover:border-gray-400
                        focus:ring-gray-500
                        shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_1px_2px_0_rgba(0,0,0,0.1)]
                        hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_2px_4px_0_rgba(0,0,0,0.15)]
                    `,
                    success: `
                        bg-green-600 text-white border-green-500
                        hover:bg-green-700 hover:border-green-400
                        focus:ring-green-500
                        shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_1px_2px_0_rgba(0,0,0,0.1)]
                        hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_2px_4px_0_rgba(0,0,0,0.15)]
                    `,
                    danger: `
                        bg-red-600 text-white border-red-500
                        hover:bg-red-700 hover:border-red-400
                        focus:ring-red-500
                        shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset,0_1px_2px_0_rgba(0,0,0,0.1)]
                        hover:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_2px_4px_0_rgba(0,0,0,0.15)]
                    `,
                    outline: `
                        bg-transparent text-blue-600 border-blue-600
                        hover:bg-blue-50 hover:border-blue-700 hover:text-blue-700
                        focus:ring-blue-500
                        shadow-[0_0_0_1px_rgba(59,130,246,0.5)_inset]
                        hover:shadow-[0_0_0_1px_rgba(29,78,216,0.6)_inset,0_1px_2px_0_rgba(0,0,0,0.05)]
                    `,
                    ghost: `
                        bg-transparent text-gray-700 border-transparent
                        hover:bg-gray-100 hover:text-gray-900
                        focus:ring-gray-500
                        shadow-none
                        hover:shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]
                    `
                };

                const classes = `
                    ${baseClasses}
                    ${sizeClasses[size] || sizeClasses.md}
                    ${styleClasses[style] || styleClasses.primary}
                `.replace(/\s+/g, ' ').trim();

                const targetAttr = target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
                const disabledAttr = disabled ? ' aria-disabled="true" tabindex="-1"' : '';
                const externalIcon = target === '_blank' && !disabled ?
                    `<svg class="w-4 h-4 ml-1 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>` : '';

                return `<a href="${href}" class="${classes}"${targetAttr}${disabledAttr}>
                    <span class="relative z-10">${token.content}</span>${externalIcon}
                </a>`;
            }
        }
    ]
};

// Usage examples:
// [button:Click Me](https://example.com){primary}
// [button:Download](./file.pdf){success,lg}
// [button:Cancel](javascript:void(0)){outline,sm}
// [button:Disabled Button](#){danger,disabled}
// [button:Same Tab](https://example.com){primary,self}
// [button:Ghost Button](#){ghost,md}