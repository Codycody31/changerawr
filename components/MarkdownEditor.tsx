import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    Text,
    List,
    Link2,
    Quote,
    FileCode,
    RotateCcw,
    RotateCw,
    Copy,
    Scissors,
    Table,
    CheckSquare,
    ChevronDown,
    Image,
    Bold,
    Italic,
    Code,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    ListOrdered,
    Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DOMPurifyInterface {
    sanitize: (html: string, options?: Record<string, unknown>) => string;
    setConfig: (config: Record<string, unknown>) => void;
}

// Import DOMPurify with SSR safety
let DOMPurify: DOMPurifyInterface = {
    sanitize: (html: string) => html,
    setConfig: () => {}
};

// Only import DOMPurify on client-side to avoid SSR issues
if (typeof window !== 'undefined') {
    import('dompurify').then(module => {
        DOMPurify = module.default;
    }).catch(err => {
        console.error('Failed to load DOMPurify', err);
    });
}

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
    // Use useEffect to ensure DOMPurify is only configured on client-side
    useEffect(() => {
        if (typeof window !== 'undefined' && typeof DOMPurify?.setConfig === 'function') {
            DOMPurify.setConfig({
                ADD_TAGS: ALLOWED_TAGS,
                ADD_ATTR: ALLOWED_ATTR,
                ALLOW_DATA_ATTR: false,
                USE_PROFILES: { html: true },
                FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'style'],
                SANITIZE_DOM: true,
                KEEP_CONTENT: true
            });
        }
    }, []);

    const mergedFeatures = { ...defaultFeatures, ...features };

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
            return `<pre class="bg-muted p-4 rounded-md overflow-x-auto my-4"><code class="language-${escapeHtml(lang)}">${escapedCode}</code></pre>`;
        });
    };

    const processInlineCode = (input: string): string => {
        if (!mergedFeatures.inlineCode) return input;
        return input.replace(/`([^`]+)`/g, (_, code) =>
            `<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">${escapeHtml(code)}</code>`
        );
    };

    const processLists = (input: string): string => {
        if (!mergedFeatures.lists) return input;

        // First, process task lists separately
        if (mergedFeatures.taskLists) {
            // Replace task list items with a special marker to be processed later
            input = input.replace(/^(\s*)-\s\[([ xX])\]\s(.+)$/gm, (match, spaces, checked, content) => {
                const isChecked = checked.toLowerCase() === 'x';
                const indentation = spaces.length;
                const escapedContent = escapeHtml(content);

                // Use a special delimiter that won't appear in normal content
                return `__TASK_ITEM_${indentation}_${isChecked ? 'CHECKED' : 'UNCHECKED'}_${escapedContent}__`;
            });
        }

        let inList = false;
        let listType = '';
        let depth = 0;

        // Process regular lists
        let processedContent = input.split('\n').map(line => {
            // Skip task items for now (they'll be processed later)
            if (line.includes('__TASK_ITEM_')) {
                return line;
            }

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
                    return `<ol class="list-decimal list-inside space-y-2 my-4">\n<li>${escapedContent}</li>`;
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
                    return `<ul class="list-disc list-inside space-y-2 my-4">\n<li>${escapedContent}</li>`;
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

        // Now, process task list items
        if (mergedFeatures.taskLists) {
            processedContent = processedContent.replace(/__TASK_ITEM_(\d+)_(CHECKED|UNCHECKED)_(.+?)__/g,
                (_, indentation, checkedState, content) => {
                    const isChecked = checkedState === 'CHECKED';
                    const indent = parseInt(indentation);
                    const marginLeft = indent > 0 ? `ml-${indent * 4}` : '';

                    return `
            <div class="flex items-center gap-2 my-2 task-list-item ${marginLeft}">
              <input type="checkbox" ${isChecked ? 'checked' : ''} disabled 
                class="form-checkbox h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <span${isChecked ? ' class="line-through text-muted-foreground"' : ''}>${content}</span>
            </div>
          `;
                }
            );
        }

        return processedContent;
    };

    // Improved line breaks handling
    const processLineBreaks = (input: string): string => {
        if (!mergedFeatures.lineBreaks) return input;

        // Handle single line breaks (when a line ends with two spaces)
        input = input.replace(/ {2}\n/g, '<br />');

        // Handle paragraphs (double line breaks)
        input = input.replace(/\n\n/g, '</p><p class="leading-7 mb-4">');

        return input;
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
                return `<img src="${src}" alt="${escapedAlt}"${titleAttr} class="max-w-full h-auto rounded-lg my-4" loading="lazy" />`;
            });
        }

        // Headers (with anchor links)
        if (mergedFeatures.headings) {
            html = html.replace(/^(#{1,6})\s(.+)$/gm, (_, level, content) => {
                const headingLevel = level.length;
                const escapedContent = escapeHtml(content);
                const id = content.toLowerCase().replace(/[^\w]+/g, '-');

                // Apply different styling based on heading level
                let headingClasses = 'group relative flex items-center gap-2';

                switch(headingLevel) {
                    case 1:
                        headingClasses += ' text-3xl font-bold mt-8 mb-4';
                        break;
                    case 2:
                        headingClasses += ' text-2xl font-semibold mt-6 mb-3';
                        break;
                    case 3:
                        headingClasses += ' text-xl font-medium mt-5 mb-3';
                        break;
                    case 4:
                        headingClasses += ' text-lg font-medium mt-4 mb-2';
                        break;
                    case 5:
                        headingClasses += ' text-base font-medium mt-3 mb-2';
                        break;
                    case 6:
                        headingClasses += ' text-sm font-medium mt-3 mb-2';
                        break;
                }

                return `<h${headingLevel} id="${id}" class="${headingClasses}">
          ${escapedContent}
          ${mergedFeatures.anchors ? `
            <a href="#${id}" class="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.5 4H5.75A3.75 3.75 0 002 7.75v.5a3.75 3.75 0 003.75 3.75h1.5m-1.5-4h3m1.5-4h1.75A3.75 3.75 0 0114 7.75v.5a3.75 3.75 0 01-3.75 3.75H8.5"/>
              </svg>
            </a>
          ` : ''}
        </h${headingLevel}>`;
            });
        }

        // Apply line break processing
        html = processLineBreaks(html);

        // Blockquotes
        if (mergedFeatures.blockquotes) {
            html = html.replace(/^(>+)\s(.+)$/gm, (_, level, content) => {
                const depth = level.length;
                const padding = (depth - 1) * 1.5;
                return `<blockquote class="pl-4 py-2 border-l-2 border-border ml-${padding} italic text-muted-foreground my-4">${escapeHtml(content)}</blockquote>`;
            });
        }

        // Tables - Completely rewritten for better handling
        if (mergedFeatures.tables) {
            // First, identify and process entire tables
            html = html.replace(/(\|.+\|\n)+/g, (tableBlock) => {
                const rows = tableBlock.trim().split('\n');

                // Extract the header row
                const headerRow = rows[0];
                const headerCells = headerRow
                    .split('|')
                    .slice(1, -1)
                    .map(cell => escapeHtml(cell.trim()));

                // Check if we have alignment row
                const isAlignmentRow = rows[1] && rows[1].includes('---');

                // Process body rows
                const bodyRows = rows.slice(isAlignmentRow ? 2 : 1);

                // Create table HTML
                let tableHtml = '<table class="w-full border-collapse border-2 rounded-md my-6 mx-auto">\n';

                // Add header
                tableHtml += '<thead class="bg-muted/50">\n<tr>\n';
                headerCells.forEach(cell => {
                    tableHtml += `<th class="border px-4 py-2 text-left font-medium">${cell}</th>\n`;
                });
                tableHtml += '</tr>\n</thead>\n';

                // Add body
                tableHtml += '<tbody>\n';
                bodyRows.forEach(row => {
                    const cells = row
                        .split('|')
                        .slice(1, -1)
                        .map(cell => escapeHtml(cell.trim()));

                    tableHtml += '<tr class="hover:bg-muted/20">\n';
                    cells.forEach(cell => {
                        tableHtml += `<td class="border px-4 py-2">${cell}</td>\n`;
                    });
                    tableHtml += '</tr>\n';
                });
                tableHtml += '</tbody>\n</table>';

                return tableHtml;
            });
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
                    return `<a href="${url}"${titleAttr} class="text-primary hover:underline inline-flex items-center gap-1" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(text)}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>`;
                }
            );
        }

        // Footnotes
        if (mergedFeatures.footnotes) {
            html = html.replace(/\[\^(\d+)\](?!:)/g, (_, num) =>
                `<sup><a href="#fn${escapeHtml(num)}" id="fnref${escapeHtml(num)}">[${escapeHtml(num)}]</a></sup>`
            );
            html = html.replace(/\[\^(\d+)\]:\s*(.+)$/gm, (_, num, content) => {
                return `<div id="fn${escapeHtml(num)}" class="text-sm text-muted-foreground mt-8 pt-2 border-t">
          ${escapeHtml(num)}. ${escapeHtml(content)}
          <a href="#fnref${escapeHtml(num)}" class="text-primary">↩</a>
        </div>`;
            });
        }

        // Horizontal rules
        if (mergedFeatures.horizontalRules) {
            html = html.replace(/^---$/gm, '<hr class="my-6 border-t border-border">');
        }

        // Wrap adjacent paragraphs
        html = html.replace(/([^\n]+?)(?:\n\n|$)/g, (_, content) => {
            if (
                content.startsWith('<') || // Skip if content starts with HTML tag
                content.trim() === '' // Skip empty lines
            ) {
                return content;
            }
            return `<p class="leading-7 mb-4">${content}</p>\n`;
        });

        // Sanitize the final HTML
        try {
            if (typeof DOMPurify?.sanitize === 'function') {
                return DOMPurify.sanitize(html, {
                    ALLOWED_TAGS,
                    ALLOWED_ATTR,
                    ALLOW_DATA_ATTR: false,
                    USE_PROFILES: { html: true },
                    RETURN_DOM_FRAGMENT: false,
                    RETURN_DOM: false,
                    SANITIZE_DOM: true
                });
            }
            // Fallback for SSR or if DOMPurify is not available
            return html;
        } catch {
            // Return unsanitized HTML during SSR, client will sanitize on hydration
            console.debug('DOMPurify sanitization skipped');
            return html;
        }
    };

    return (
        <div
            className={`prose max-w-none prose-img:my-4 prose-headings:mt-6 prose-headings:mb-4 prose-p:mb-4 prose-pre:my-4 prose-blockquote:my-4 ${className}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(children) }}
            suppressHydrationWarning
        />
    );
};

// Instead of configuring DOMPurify globally, we'll only use it in the component function
// This helps prevent SSR issues

// Helper type for selection formatting actions
interface SelectionAction {
    icon: React.ReactNode;
    label: string;
    prefix: string;
    suffix: string;
    shortcut?: string;
}

interface MarkdownAction {
    label: string;
    icon: React.ReactNode;
    prefix: string;
    suffix: string;
    shortcut?: string;
    group?: string;
}

interface HeadingAction extends SelectionAction {
    level: number;
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

const HEADING_ACTIONS: HeadingAction[] = [
    {
        icon: <Heading1 className="w-4 h-4" />,
        label: 'Heading 1',
        prefix: '# ',
        suffix: '',
        level: 1,
        shortcut: '⌘+1'
    },
    {
        icon: <Heading2 className="w-4 h-4" />,
        label: 'Heading 2',
        prefix: '## ',
        suffix: '',
        level: 2,
        shortcut: '⌘+2'
    },
    {
        icon: <Heading3 className="w-4 h-4" />,
        label: 'Heading 3',
        prefix: '### ',
        suffix: '',
        level: 3,
        shortcut: '⌘+3'
    },
    {
        icon: <Heading4 className="w-4 h-4" />,
        label: 'Heading 4',
        prefix: '#### ',
        suffix: '',
        level: 4,
        shortcut: '⌘+4'
    },
    {
        icon: <Heading5 className="w-4 h-4" />,
        label: 'Heading 5',
        prefix: '##### ',
        suffix: '',
        level: 5,
        shortcut: '⌘+5'
    }
];

const SELECTION_ACTIONS: SelectionAction[] = [
    {
        icon: <Bold className="w-4 h-4" />,
        label: 'Bold',
        prefix: '**',
        suffix: '**',
        shortcut: '⌘+B'
    },
    {
        icon: <Italic className="w-4 h-4" />,
        label: 'Italic',
        prefix: '_',
        suffix: '_',
        shortcut: '⌘+I'
    },
    {
        icon: <Code className="w-4 h-4" />,
        label: 'Inline Code',
        prefix: '`',
        suffix: '`',
        shortcut: '⌘+K'
    },
    {
        icon: <Link2 className="w-4 h-4" />,
        label: 'Link',
        prefix: '[',
        suffix: '](url)',
        shortcut: '⌘+L'
    },
    {
        icon: <Quote className="w-4 h-4" />,
        label: 'Quote',
        prefix: '> ',
        suffix: '',
    },
    {
        icon: <CheckSquare className="w-4 h-4" />,
        label: 'Task',
        prefix: '- [ ] ',
        suffix: '',
    },
    {
        icon: <Check className="w-4 h-4" />,
        label: 'Done Task',
        prefix: '- [x] ',
        suffix: '',
    }
];

const DEFAULT_ACTIONS: MarkdownAction[] = [
    {
        label: 'Bold',
        icon: <Bold className="w-4 h-4" />,
        prefix: '**',
        suffix: '**',
        shortcut: '⌘+B',
        group: 'format'
    },
    {
        label: 'Italic',
        icon: <Italic className="w-4 h-4" />,
        prefix: '_',
        suffix: '_',
        shortcut: '⌘+I',
        group: 'format'
    },
    {
        label: 'Heading',
        icon: <Heading2 className="w-4 h-4" />,
        prefix: '## ',
        suffix: '',
        shortcut: '⌘+H',
        group: 'format'
    },
    {
        label: 'List',
        icon: <List className="w-4 h-4" />,
        prefix: '- ',
        suffix: '',
        group: 'format'
    },
    {
        label: 'Ordered List',
        icon: <ListOrdered className="w-4 h-4" />,
        prefix: '1. ',
        suffix: '',
        group: 'format'
    },
    {
        label: 'Task List',
        icon: <CheckSquare className="w-4 h-4" />,
        prefix: '- [ ] ',
        suffix: '',
        group: 'format'
    },
    {
        label: 'Line Break',
        icon: <Text className="w-4 h-4" />,
        prefix: '  \n',
        suffix: '',
        shortcut: '⇧↵',
        group: 'format'
    },
    {
        label: 'Link',
        icon: <Link2 className="w-4 h-4" />,
        prefix: '[',
        suffix: '](url)',
        group: 'insert'
    },
    {
        label: 'Quote',
        icon: <Quote className="w-4 h-4" />,
        prefix: '> ',
        suffix: '',
        group: 'insert'
    },
    {
        label: 'Code',
        icon: <FileCode className="w-4 h-4" />,
        prefix: '```\n',
        suffix: '\n```',
        group: 'insert'
    },
    {
        label: 'Image',
        icon: <Image className="w-4 h-4" />,
        prefix: '![',
        suffix: '](url)',
        group: 'insert'
    },
    {
        label: 'Table',
        icon: <Table className="w-4 h-4" />,
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
    const [activeTab, setActiveTab] = useState<string>("edit");
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [selectionState, setSelectionState] = useState({
        start: 0,
        end: 0,
        text: '',
        isSelecting: false,
        position: { x: 0, y: 0 }
    });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (initialValue !== content) {
            setContent(initialValue);
            setHistory([initialValue]);
            setHistoryIndex(0);
        }
    }, [initialValue]);

    useEffect(() => {
        // Update word count
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        setWordCount(words);

        // Update character count
        setCharCount(content.length);
    }, [content]);

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
        const textarea = textareaRef.current;
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
        // Check for selection toolbar shortcuts
        if (e.metaKey || e.ctrlKey) {
            // Handle heading shortcuts
            if (e.key >= "1" && e.key <= "5") {
                e.preventDefault();
                const headingLevel = parseInt(e.key);
                const headingAction = HEADING_ACTIONS.find(h => h.level === headingLevel);
                if (headingAction) {
                    insertMarkdown(headingAction.prefix, headingAction.suffix);
                }
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    insertMarkdown('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    insertMarkdown('_', '_');
                    break;
                case 'k':
                    e.preventDefault();
                    insertMarkdown('`', '`');
                    break;
                case 'l':
                    e.preventDefault();
                    insertMarkdown('[', '](url)');
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

    const handleSelection = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start !== end) {
            // There is a selection
            const selectedText = content.substring(start, end);

            // Calculate position for the floating toolbar
            // This is more complex in practice and might need adjustment based on scroll position
            const selectionRect = textarea.getBoundingClientRect();
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);

            // Get the position of the cursor relative to the textarea
            const textBeforeSelection = content.substring(0, start);
            const linesBeforeSelection = textBeforeSelection.split('\n').length;

            // Approximate position calculation
            const position = {
                x: selectionRect.left + 50, // Arbitrary offset
                y: selectionRect.top + linesBeforeSelection * lineHeight - textarea.scrollTop
            };

            setSelectionState({
                start,
                end,
                text: selectedText,
                isSelecting: true,
                position
            });
        } else {
            // No selection
            setSelectionState(prev => ({
                ...prev,
                isSelecting: false
            }));
        }
    };

    const handleSelectionAction = (action: SelectionAction) => {
        if (selectionState.isSelecting && textareaRef.current) {
            const { start, end, text } = selectionState;

            const newContent =
                content.substring(0, start) +
                action.prefix +
                text +
                action.suffix +
                content.substring(end);

            updateContent(newContent);

            // Reset selection state
            setSelectionState(prev => ({
                ...prev,
                isSelecting: false
            }));

            // Focus back on textarea and set cursor position
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(
                        start + action.prefix.length,
                        end + action.prefix.length
                    );
                }
            });
        }
    };

    const groupedActions = DEFAULT_ACTIONS.reduce((acc, action) => {
        const group = action.group || 'other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(action);
        return acc;
    }, {} as Record<string, MarkdownAction[]>);

    return (
        <Card className={`w-full ${className} overflow-hidden shadow-md rounded-lg`} style={{ height }}>
            <CardContent className="p-0 h-full flex flex-col">
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 flex flex-col"
                >
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
                                            <RotateCcw className="w-4 h-4" />
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
                                            <RotateCw className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <div className="w-px h-4 bg-border mx-1" />

                            {/* Headings Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                        <Heading2 className="w-4 h-4" />
                                        <span>Headings</span>
                                        <ChevronDown className="ml-1 w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {HEADING_ACTIONS.map((action) => (
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

                            {/* Other dropdowns */}
                            {Object.entries(groupedActions).map(([group, actions]) => (
                                <DropdownMenu key={group}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="capitalize flex items-center gap-1">
                                            {group === 'format' ? <Bold className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                                            <span>{group}</span>
                                            <ChevronDown className="ml-1 w-3 h-3" />
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

                        <div className="ml-auto flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                                {wordCount} words | {charCount} chars
                            </div>
                            <TabsList>
                                <TabsTrigger value="edit">Edit</TabsTrigger>
                                <TabsTrigger value="preview">Preview</TabsTrigger>
                                <TabsTrigger value="split">Split</TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <div className="relative flex-1">
                        <TabsContent value="edit" className="m-0 absolute inset-0 h-full">
                            <div className="h-full relative">
                                <Textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={(e) => updateContent(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onMouseUp={handleSelection}
                                    onKeyUp={handleSelection}
                                    placeholder={placeholder}
                                    className={`h-full w-full resize-none font-mono text-base border-0 rounded-none focus-visible:ring-0 p-4 ${resizable ? 'resize-y' : ''}`}
                                    autoFocus={autoFocus}
                                    maxLength={maxLength}
                                    style={{
                                        minHeight: '100%',
                                        maxHeight: resizable ? 'none' : '100%',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: 1.5
                                    }}
                                />

                                {/* Selection Toolbar */}
                                <AnimatePresence>
                                    {selectionState.isSelecting && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute bg-popover shadow-md rounded-md p-1 flex items-center gap-1 z-50"
                                            style={{
                                                left: selectionState.position.x,
                                                top: selectionState.position.y - 40,
                                            }}
                                        >
                                            {SELECTION_ACTIONS.map((action) => (
                                                <TooltipProvider key={action.label}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => handleSelectionAction(action)}
                                                            >
                                                                {action.icon}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>{action.label} {action.shortcut && `(${action.shortcut})`}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <DropdownMenu>
                                    <DropdownMenuTrigger />
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => document.execCommand('cut')}>
                                            <Scissors className="w-4 h-4 mr-2" />
                                            Cut
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => document.execCommand('copy')}>
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copy
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
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
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="p-4"
                            >
                                <RenderMarkdown features={features} className="h-full">
                                    {content}
                                </RenderMarkdown>
                            </motion.div>
                        </TabsContent>

                        <TabsContent value="split" className="m-0 absolute inset-0 h-full overflow-hidden">
                            <div className="flex h-full">
                                <div className="w-1/2 h-full border-r relative">
                                    <Textarea
                                        ref={textareaRef}
                                        value={content}
                                        onChange={(e) => updateContent(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onMouseUp={handleSelection}
                                        onKeyUp={handleSelection}
                                        placeholder={placeholder}
                                        className="h-full w-full resize-none font-mono text-base border-0 rounded-none focus-visible:ring-0 p-4"
                                        style={{
                                            minHeight: '100%',
                                            maxHeight: '100%',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.5
                                        }}
                                    />

                                    {/* Selection Toolbar for Split View */}
                                    <AnimatePresence>
                                        {selectionState.isSelecting && activeTab === 'split' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute bg-popover shadow-md rounded-md p-1 flex items-center gap-1 z-50"
                                                style={{
                                                    left: selectionState.position.x / 2, // Adjust for split view
                                                    top: selectionState.position.y - 40,
                                                }}
                                            >
                                                {SELECTION_ACTIONS.map((action) => (
                                                    <TooltipProvider key={action.label}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={() => handleSelectionAction(action)}
                                                                >
                                                                    {action.icon}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p>{action.label} {action.shortcut && `(${action.shortcut})`}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="w-1/2 h-full overflow-auto">
                                    <div className="p-4">
                                        <RenderMarkdown features={features} className="h-full">
                                            {content}
                                        </RenderMarkdown>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default MarkdownEditor;