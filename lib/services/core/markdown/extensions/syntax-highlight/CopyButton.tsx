'use client';

import {useCallback, useState} from 'react';
import {Copy, Check} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';

const RESET_DELAY_MS = 1500;

/**
 * Copies text to the clipboard, falling back to `document.execCommand('copy')`
 * (which prompts for clipboard access in some browsers) when the async
 * Clipboard API is unavailable or rejected, e.g. insecure context or denied
 * permission.
 */
async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall through to legacy fallback below
        }
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        const succeeded = document.execCommand('copy');
        document.body.removeChild(textarea);
        return succeeded;
    } catch {
        return false;
    }
}

interface CopyButtonProps {
    code: string;
}

/**
 * "Copy code" button rendered into the syntax-highlight extension's
 * `[data-copy-button]` placeholder via a portal.
 */
export function CopyButton({code}: CopyButtonProps) {
    const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

    const handleCopy = useCallback(() => {
        copyToClipboard(code).then((succeeded) => {
            setStatus(succeeded ? 'copied' : 'failed');
            window.setTimeout(() => setStatus('idle'), RESET_DELAY_MS);
        });
    }, [code]);

    return (
        <TooltipProvider>
            <Tooltip open={status !== 'idle'}>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCopy}
                        aria-label={status === 'failed' ? 'Copy failed' : 'Copy code'}
                    >
                        {status === 'copied' ? <Check size={15}/> : <Copy size={15}/>}
                    </Button>
                </TooltipTrigger>
                <TooltipContent variant={status === 'failed' ? 'error' : 'success'} size="sm">
                    {status === 'failed' ? 'Copy failed' : 'Copied!'}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
