import React, {useState, useCallback, useEffect} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Camera,
    Type,
    Text,
    List,
    Link2,
    Quote,
    FileCode,
    AlignCenter,
    RotateCcw,
    RotateCw,
    Copy,
    Scissors
} from 'lucide-react';
import DOMPurify from 'dompurify';

interface MarkdownFeatures {
    headings?: boolean;
    anchors?: boolean;
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    blockquotes?: boolean;
    code?: boolean;
    inlineCode?: boolean;
    links?: boolean;
    images?: boolean;
    lists?: boolean;
    taskLists?: boolean;
    tables?: boolean;
    footnotes?: boolean;
    lineBreaks?: boolean;
    horizontalRules?: boolean;
}

interface RenderMarkdownProps {
    children: string;
    className?: string;
    features?: Partial<MarkdownFeatures>;
}

const defaultFeatures: MarkdownFeatures = {
    headings: true,
    anchors: true,
    bold: true,
    italic: true,
    strikethrough: true,
    blockquotes: true,
    code: true,
    inlineCode: true,
    links: true,
    images: true,
    lists: true,
    taskLists: true,
    tables: true,
    footnotes: true,
    lineBreaks: true,
    horizontalRules: true,
};

const ALLOWED_TAGS = [
    'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em',
    'strong', 'del', 'a', 'img', 'br', 'hr', 'table', 'thead',
    'tbody', 'tr', 'th', 'td', 'sup', 'input'
];

const ALLOWED_ATTR = [
    'class', 'id', 'href', 'target', 'rel', 'src', 'alt',
    'title', 'type', 'checked', 'disabled'
];

export const RenderMarkdown: React.FC<RenderMarkdownProps> = ({
                                                                  children,
                                                                  className = '',
                                                                  features = defaultFeatures
                                                              }) => {
    const mergedFeatures = {...defaultFeatures, ...features};

    const escapeHtml = (unsafe: string): string => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const processCodeBlocks = (input: string): string => {
        if (!mergedFeatures.code) return input;
        return input.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, (_, lang, code) => {
            const escapedCode = escapeHtml(code.trim());
            return `<pre class="bg-muted p-4 rounded-md overflow-x-auto"><code class="language-${escapeHtml(lang)}">${escapedCode}</code></pre>`;
        });
    };

    const processInlineCode = (input: string): string => {
        if (!mergedFeatures.inlineCode) return input;
        return input.replace(/`([^`]+)`/g, (_, code) =>
            `<code class="bg-muted px-1.5 py-0.5 rounded text-sm">${escapeHtml(code)}</code>`
        );
    };

    const processLists = (input: string): string => {
        if (!mergedFeatures.lists) return input;

        let inList = false;
        let listType = '';
        let depth = 0;

        return input.split('\n').map(line => {
            // Ordered list
            const orderedMatch = line.match(/^(\s*)\d+\.\s(.+)/);
            if (orderedMatch) {
                const [, spaces, content] = orderedMatch;
                const currentDepth = spaces.length / 2;
                const escapedContent = escapeHtml(content);

                if (!inList || listType !== 'ol') {
                    inList = true;
                    listType = 'ol';
                    depth = currentDepth;
                    return `<ol class="list-decimal list-inside space-y-1">\n<li>${escapedContent}</li>`;
                }

                if (currentDepth > depth) {
                    depth = currentDepth;
                    return `<ol class="list-decimal list-inside ml-4 space-y-1">\n<li>${escapedContent}</li>`;
                }

                if (currentDepth < depth) {
                    depth = currentDepth;
                    return `</ol>\n<li>${escapedContent}</li>`;
                }

                return `<li>${escapedContent}</li>`;
            }

            // Unordered list
            const unorderedMatch = line.match(/^(\s*)-\s(.+)/);
            if (unorderedMatch) {
                const [, spaces, content] = unorderedMatch;
                const currentDepth = spaces.length / 2;
                const escapedContent = escapeHtml(content);

                if (!inList || listType !== 'ul') {
                    inList = true;
                    listType = 'ul';
                    depth = currentDepth;
                    return `<ul class="list-disc list-inside space-y-1">\n<li>${escapedContent}</li>`;
                }

                if (currentDepth > depth) {
                    depth = currentDepth;
                    return `<ul class="list-disc list-inside ml-4 space-y-1">\n<li>${escapedContent}</li>`;
                }

                if (currentDepth < depth) {
                    depth = currentDepth;
                    return `</ul>\n<li>${escapedContent}</li>`;
                }

                return `<li>${escapedContent}</li>`;
            }

            if (inList) {
                inList = false;
                return `${listType === 'ol' ? '</ol>' : '</ul>'}\n${escapeHtml(line)}`;
            }

            return escapeHtml(line);
        }).join('\n');
    };

    const renderMarkdown = (text: string): string => {
        let html = text;

        // Process blocks in specific order
        html = processCodeBlocks(html);
        html = processLists(html);

        // Images - Process before other elements to prevent interference
        if (mergedFeatures.images) {
            html = html.replace(/!\[(.*?)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g, (_, alt, src, title) => {
                const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
                const escapedAlt = escapeHtml(alt || '');
                // Don't validate or modify the source URL
                return `<img src="${src}" alt="${escapedAlt}"${titleAttr} class="max-w-full h-auto rounded-lg my-2" loading="lazy" />`;
            });
        }

        // Headers (with anchor links)
        if (mergedFeatures.headings) {
            html = html.replace(/^(#{1,6})\s(.+)$/gm, (_, level, content) => {
                const headingLevel = level.length;
                const escapedContent = escapeHtml(content);
                const id = content.toLowerCase().replace(/[^\w]+/g, '-');
                return `<h${headingLevel} id="${id}" class="group relative flex items-center gap-2">
                    ${escapedContent}
                    ${mergedFeatures.anchors ? `
                        <a href="#${id}" class="opacity-0 group-hover:opacity-100 text-muted-foreground">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M7.5 4H5.75A3.75 3.75 0 002 7.75v.5a3.75 3.75 0 003.75 3.75h1.5m-1.5-4h3m1.5-4h1.75A3.75 3.75 0 0114 7.75v.5a3.75 3.75 0 01-3.75 3.75H8.5"/>
                            </svg>
                        </a>
                    ` : ''}
                </h${headingLevel}>`;
            });
        }

        // Line breaks
        if (mergedFeatures.lineBreaks) {
            html = html.replace(/\n\n/g, '</p><p class="leading-7">');
            html = html.replace(/ {2}\n/g, '<br />');
        }

        // Blockquotes
        if (mergedFeatures.blockquotes) {
            html = html.replace(/^(>+)\s(.+)$/gm, (_, level, content) => {
                const depth = level.length;
                const padding = (depth - 1) * 1.5;
                return `<blockquote class="pl-4 border-l-2 border-border ml-${padding} italic text-muted-foreground">${escapeHtml(content)}</blockquote>`;
            });
        }

        // Tables
        if (mergedFeatures.tables) {
            let tableStarted = false;
            html = html.replace(/^\|(.+)\|$/gm, (match) => {
                const cells = match
                    .split('|')
                    .slice(1, -1)
                    .map(cell => escapeHtml(cell.trim()));

                if (match.includes('---')) {
                    tableStarted = true;
                    return '';
                }

                const tag = !tableStarted ? 'th' : 'td';
                tableStarted = true;

                return `<tr>${cells.map(cell =>
                    `<${tag} class="border px-4 py-2">${cell}</${tag}>`
                ).join('')}</tr>`;
            });

            // Wrap tables properly
            html = html.replace(/<tr>[\s\S]*?<\/tr>/g, (match) => {
                if (match.includes('<th')) {
                    return `<table class="w-full border-collapse border"><thead>${match}</thead><tbody>`;
                } else if (match.includes('<td')) {
                    return `${match}`;
                }
                return match;
            });
            html = html.replace(/(<\/tr>\s*<\/tbody>)(?![\s\S]*<\/table>)/g, '</tr></tbody></table>');
        }

        // Process inline elements
        html = processInlineCode(html);

        // Bold
        if (mergedFeatures.bold) {
            html = html.replace(/\*\*(.*?)\*\*/g, (_, content) => `<strong>${escapeHtml(content)}</strong>`);
        }

        // Italic
        if (mergedFeatures.italic) {
            html = html.replace(/\b_(.*?)_\b/g, (_, content) => `<em>${escapeHtml(content)}</em>`);
        }

        // Strikethrough
        if (mergedFeatures.strikethrough) {
            html = html.replace(/~~(.*?)~~/g, (_, content) => `<del>${escapeHtml(content)}</del>`);
        }

        // Links
        if (mergedFeatures.links) {
            html = html.replace(
                /\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g,
                (_, text, url, title) => {
                    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
                    return `<a href="${url}"${titleAttr} class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
                }
            );
        }

        // Task lists
        if (mergedFeatures.taskLists) {
            html = html.replace(/^(\s*)-\s\[([ x])\]\s(.+)$/gm, (_, spaces, checked, content) => {
                const isChecked = checked === 'x';
                return `
                    <div class="flex items-center gap-2">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} disabled class="form-checkbox h-4 w-4">
                        <span${isChecked ? ' class="line-through text-muted-foreground"' : ''}>${escapeHtml(content)}</span>
                    </div>
                `;
            });
        }

        // Footnotes
        if (mergedFeatures.footnotes) {
            html = html.replace(/\[\^(\d+)\](?!:)/g, (_, num) =>
                `<sup><a href="#fn${escapeHtml(num)}" id="fnref${escapeHtml(num)}">[${escapeHtml(num)}]</a></sup>`
            );
            html = html.replace(/\[\^(\d+)\]:\s*(.+)$/gm, (_, num, content) => {
                return `<div id="fn${escapeHtml(num)}" class="text-sm text-muted-foreground">
                    ${escapeHtml(num)}. ${escapeHtml(content)}
                    <a href="#fnref${escapeHtml(num)}" class="text-primary">↩</a>
                </div>`;
            });
        }

        // Horizontal rules
        if (mergedFeatures.horizontalRules) {
            html = html.replace(/^---$/gm, '<hr class="my-4 border-t border-border">');
        }

        // Wrap adjacent paragraphs
        html = html.replace(/([^\n]+?)(?:\n\n|$)/g, (_, content) => {
            if (
                content.startsWith('<') || // Skip if content starts with HTML tag
                content.trim() === '' // Skip empty lines
            ) {
                return content;
            }
            return `<p class="leading-7">${content}</p>\n`;
        });

        // Configure DOMPurify
        DOMPurify.setConfig({
            ADD_TAGS: ALLOWED_TAGS,
            ADD_ATTR: ALLOWED_ATTR,
            ALLOW_DATA_ATTR: false,
            USE_PROFILES: {html: true},
            FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'style'],
            SANITIZE_DOM: true,
            KEEP_CONTENT: true
        });

        // Sanitize the final HTML
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS,
            ALLOWED_ATTR,
            ALLOW_DATA_ATTR: false,
            USE_PROFILES: {html: true},
            RETURN_DOM_FRAGMENT: false,
            RETURN_DOM: false,
            SANITIZE_DOM: true
        });
    };

    return (
        <div
            className={`prose max-w-none ${className}`}
            dangerouslySetInnerHTML={{__html: renderMarkdown(children)}}
            suppressHydrationWarning
        />
    );
};

// Configure DOMPurify
DOMPurify.setConfig({
    ADD_TAGS: ALLOWED_TAGS,
    ADD_ATTR: ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'style'],
    SANITIZE_DOM: true,
    KEEP_CONTENT: true
});

interface MarkdownAction {
    label: string;
    icon: React.ReactNode;
    prefix: string;
    suffix: string;
    shortcut?: string;
    group?: string;
}

interface EditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    onSave?: (value: string) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    maxLength?: number;
    height?: string;
    resizable?: boolean;
    features?: MarkdownFeatures;
}

const DEFAULT_ACTIONS: MarkdownAction[] = [
    {
        label: 'Bold',
        icon: <Type className="w-4 h-4"/>,
        prefix: '**',
        suffix: '**',
        shortcut: '⌘+B',
        group: 'format'
    },
    {
        label: 'Italic',
        icon: <Text className="w-4 h-4"/>,
        prefix: '_',
        suffix: '_',
        shortcut: '⌘+I',
        group: 'format'
    },
    {
        label: 'Heading',
        icon: <AlignCenter className="w-4 h-4"/>,
        prefix: '## ',
        suffix: '',
        shortcut: '⌘+H',
        group: 'format'
    },
    {
        label: 'List',
        icon: <List className="w-4 h-4"/>,
        prefix: '- ',
        suffix: '',
        group: 'format'
    },
    {
        label: 'Line Break',
        icon: <Text className="w-4 h-4"/>,
        prefix: '  \n',
        suffix: '',
        shortcut: '⇧↵',
        group: 'format'
    },
    {
        label: 'Link',
        icon: <Link2 className="w-4 h-4"/>,
        prefix: '[',
        suffix: '](url)',
        group: 'insert'
    },
    {
        label: 'Quote',
        icon: <Quote className="w-4 h-4"/>,
        prefix: '> ',
        suffix: '',
        group: 'insert'
    },
    {
        label: 'Code',
        icon: <FileCode className="w-4 h-4"/>,
        prefix: '```\n',
        suffix: '\n```',
        group: 'insert'
    },
    {
        label: 'Image',
        icon: <Camera className="w-4 h-4"/>,
        prefix: '![',
        suffix: '](url)',
        group: 'insert'
    },
    {
        label: 'Table',
        icon: <AlignCenter className="w-4 h-4"/>,
        prefix: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
        suffix: '',
        group: 'insert'
    }
];

export const MarkdownEditor: React.FC<EditorProps> = ({
                                                          initialValue = '',
                                                          onChange,
                                                          onSave,
                                                          placeholder = 'Start writing...',
                                                          className = '',
                                                          autoFocus = false,
                                                          maxLength,
                                                          height = '400px',
                                                          resizable = false,
                                                          features = defaultFeatures,
                                                      }) => {
    const [content, setContent] = useState(initialValue);
    const [history, setHistory] = useState<string[]>([initialValue]);
    const [historyIndex, setHistoryIndex] = useState(0);

    useEffect(() => {
        if (initialValue !== content) {
            setContent(initialValue);
            setHistory([initialValue]);
            setHistoryIndex(0);
        }
    }, [initialValue]);

    const updateContent = useCallback((newContent: string) => {
        if (newContent === content) return;

        setContent(newContent);
        onChange?.(newContent);

        // Update history
        const newHistory = [...history.slice(0, historyIndex + 1), newContent];
        setHistory(newHistory);
        setHistoryIndex(historyIndex + 1);
    }, [onChange, historyIndex, content, history]);

    const insertMarkdown = useCallback((prefix: string, suffix: string) => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent =
            content.substring(0, start) +
            prefix +
            selectedText +
            suffix +
            content.substring(end);

        updateContent(newContent);

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + prefix.length,
                end + prefix.length
            );
        });
    }, [content, updateContent]);

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setContent(history[historyIndex - 1]);
            onChange?.(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setContent(history[historyIndex + 1]);
            onChange?.(history[historyIndex + 1]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    insertMarkdown('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    insertMarkdown('_', '_');
                    break;
                case 'h':
                    e.preventDefault();
                    insertMarkdown('## ', '');
                    break;
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                    break;
                case 's':
                    e.preventDefault();
                    onSave?.(content);
                    break;
            }
        } else if (e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            insertMarkdown('  \n', '');
        }
    };

    const groupedActions = DEFAULT_ACTIONS.reduce((acc, action) => {
        const group = action.group || 'other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(action);
        return acc;
    }, {} as Record<string, MarkdownAction[]>);


    return (
        <Card className={`w-full ${className}`} style={{height}}>
            <CardContent className="p-0 h-full flex flex-col">
                <Tabs defaultValue="edit" className="flex-1 flex flex-col">
                    <div className="border-b flex items-center gap-1 p-2 bg-muted/50">
                        <div className="flex items-center gap-1">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={undo}
                                            disabled={historyIndex === 0}
                                        >
                                            <RotateCcw className="w-4 h-4"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Undo (⌘Z)</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={redo}
                                            disabled={historyIndex === history.length - 1}
                                        >
                                            <RotateCw className="w-4 h-4"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <div className="w-px h-4 bg-border mx-1"/>

                            {Object.entries(groupedActions).map(([group, actions]) => (
                                <DropdownMenu key={group}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="capitalize">
                                            {group}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {actions.map((action) => (
                                            <DropdownMenuItem
                                                key={action.label}
                                                onClick={() => insertMarkdown(action.prefix, action.suffix)}
                                            >
                                                <span className="mr-2">{action.icon}</span>
                                                <span>{action.label}</span>
                                                {action.shortcut && (
                                                    <span className="ml-auto text-xs text-muted-foreground">
                                                        {action.shortcut}
                                                    </span>
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ))}
                        </div>

                        <div className="ml-auto">
                            <TabsList>
                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                <TabsTrigger value="preview">Preview</TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <div className="relative flex-1">
                        <TabsContent value="edit" className="m-0 absolute inset-0 h-full">
                            <div className="h-full relative">
                                <Textarea
                                    value={content}
                                    onChange={(e) => updateContent(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={placeholder}
                                    className={`h-full w-full resize-none font-mono border-0 rounded-none focus-visible:ring-0 ${resizable ? 'resize-y' : ''}`}
                                    autoFocus={autoFocus}
                                    maxLength={maxLength}
                                    style={{
                                        minHeight: '100%',
                                        maxHeight: resizable ? 'none' : '100%'
                                    }}
                                />

                                <DropdownMenu>
                                    <DropdownMenuTrigger/>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => document.execCommand('cut')}>
                                            <Scissors className="w-4 h-4 mr-2"/>
                                            Cut
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => document.execCommand('copy')}>
                                            <Copy className="w-4 h-4 mr-2"/>
                                            Copy
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator/>
                                        {DEFAULT_ACTIONS.map((action) => (
                                            <DropdownMenuItem
                                                key={action.label}
                                                onClick={() => insertMarkdown(action.prefix, action.suffix)}
                                            >
                                                <span className="mr-2">{action.icon}</span>
                                                <span>{action.label}</span>
                                                {action.shortcut && (
                                                    <span className="ml-auto text-xs text-muted-foreground">
                                                        {action.shortcut}
                                                    </span>
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview" className="m-0 absolute inset-0 h-full overflow-auto">
                            <RenderMarkdown features={features} className="h-full p-4">
                                {content}
                            </RenderMarkdown>
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default MarkdownEditor;