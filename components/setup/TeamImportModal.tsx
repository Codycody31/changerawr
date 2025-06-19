// components/setup/TeamImportModal.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { FileText, Upload, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (emails: Array<{ email: string; name?: string }>) => void;
    existingEmails: string[];
}

interface ParsedEmail {
    email: string;
    name?: string;
    isValid: boolean;
    isDuplicate: boolean;
    error?: string;
}

const TEMPLATE_EXAMPLES = {
    plaintext: `alice@company.com
bob@company.com
carol@company.com`,
    csv: `email,name
alice@company.com,Alice Smith
bob@company.com,Bob Johnson
carol@company.com,Carol Davis`,
    mixed: `alice@company.com Alice Smith
bob@company.com
carol@company.com "Carol Davis"`
};

export function TeamImportModal({
                                    open,
                                    onOpenChange,
                                    onImport,
                                    existingEmails
                                }: TeamImportModalProps) {
    const [inputText, setInputText] = useState('');
    const [parsedEmails, setParsedEmails] = useState<ParsedEmail[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Parse different input formats
    const parseEmailInput = useCallback((text: string): ParsedEmail[] => {
        if (!text.trim()) return [];

        const lines = text.trim().split('\n').filter(line => line.trim());
        const results: ParsedEmail[] = [];
        const existingEmailsLower = existingEmails.map(e => e.toLowerCase());
        const seenEmails = new Set<string>();

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Try different parsing strategies
            let email = '';
            let name = '';
            let error = '';

            // Strategy 1: CSV format (email,name)
            if (trimmedLine.includes(',')) {
                const parts = trimmedLine.split(',').map(p => p.trim().replace(/"/g, ''));
                email = parts[0];
                name = parts[1] || '';
            }
            // Strategy 2: Email with space-separated name
            else if (trimmedLine.includes(' ')) {
                const parts = trimmedLine.split(' ');
                email = parts[0];
                // Join remaining parts as name
                name = parts.slice(1).join(' ').replace(/"/g, '');
            }
            // Strategy 3: Just email
            else {
                email = trimmedLine;
            }

            // Validate email
            const isValid = emailRegex.test(email);
            if (!isValid) {
                error = 'Invalid email format';
            }

            // Check for duplicates (case insensitive)
            const emailLower = email.toLowerCase();
            const isDuplicate = existingEmailsLower.includes(emailLower) || seenEmails.has(emailLower);

            if (isDuplicate && isValid) {
                error = 'Email already exists';
            }

            if (isValid) {
                seenEmails.add(emailLower);
            }

            results.push({
                email,
                name: name || undefined,
                isValid,
                isDuplicate,
                error
            });
        }

        return results;
    }, [existingEmails, emailRegex]);

    // Handle input change with real-time parsing
    const handleInputChange = useCallback((value: string) => {
        setInputText(value);

        if (value.trim()) {
            setIsProcessing(true);
            // Debounce parsing for better performance
            const timeoutId = setTimeout(() => {
                const parsed = parseEmailInput(value);
                setParsedEmails(parsed);
                setIsProcessing(false);
            }, 300);

            return () => clearTimeout(timeoutId);
        } else {
            setParsedEmails([]);
            setIsProcessing(false);
        }
    }, [parseEmailInput]);

    // Handle import
    const handleImport = useCallback(() => {
        const validEmails = parsedEmails.filter(p => p.isValid && !p.isDuplicate);

        if (validEmails.length === 0) {
            toast({
                title: "No valid emails",
                description: "Please add some valid email addresses to import",
                variant: "destructive"
            });
            return;
        }

        onImport(validEmails.map(e => ({ email: e.email, name: e.name })));

        toast({
            title: "Import successful! 🦖",
            description: `${validEmails.length} email${validEmails.length !== 1 ? 's' : ''} imported`,
        });

        // Reset and close
        setInputText('');
        setParsedEmails([]);
        onOpenChange(false);
    }, [parsedEmails, onImport, onOpenChange]);

    // Insert template
    const insertTemplate = useCallback((template: string) => {
        setInputText(template);
        handleInputChange(template);
    }, [handleInputChange]);

    // Stats
    const validCount = parsedEmails.filter(p => p.isValid && !p.isDuplicate).length;
    const invalidCount = parsedEmails.filter(p => !p.isValid).length;
    const duplicateCount = parsedEmails.filter(p => p.isDuplicate && p.isValid).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Import Team Email List
                    </DialogTitle>
                    <DialogDescription>
                        Import multiple email addresses at once. Supports various formats including CSV and plain text.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-4 overflow-hidden">
                    {/* Templates */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Quick Templates:</h4>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => insertTemplate(TEMPLATE_EXAMPLES.plaintext)}
                            >
                                <FileText className="w-3 h-3 mr-1" />
                                Plain Text
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => insertTemplate(TEMPLATE_EXAMPLES.csv)}
                            >
                                <FileText className="w-3 h-3 mr-1" />
                                CSV Format
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => insertTemplate(TEMPLATE_EXAMPLES.mixed)}
                            >
                                <FileText className="w-3 h-3 mr-1" />
                                Mixed Format
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Input area */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email List:</label>
                        <Textarea
                            placeholder={`Enter email addresses (one per line):

alice@company.com
bob@company.com
carol@company.com

Or use CSV format:
email,name
alice@company.com,Alice Smith`}
                            value={inputText}
                            onChange={(e) => handleInputChange(e.target.value)}
                            className="min-h-[150px] font-mono text-sm"
                        />
                    </div>

                    {/* Preview and stats */}
                    <AnimatePresence>
                        {(parsedEmails.length > 0 || isProcessing) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3"
                            >
                                {/* Stats */}
                                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-sm">
                      <strong>{validCount}</strong> valid
                    </span>
                                    </div>

                                    {invalidCount > 0 && (
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                            <span className="text-sm">
                        <strong>{invalidCount}</strong> invalid
                      </span>
                                        </div>
                                    )}

                                    {duplicateCount > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-orange-600" />
                                            <span className="text-sm">
                        <strong>{duplicateCount}</strong> duplicate
                      </span>
                                        </div>
                                    )}

                                    {isProcessing && (
                                        <div className="flex items-center gap-2">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-4 h-4"
                                            >
                                                ⚙️
                                            </motion.div>
                                            <span className="text-sm">Processing...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Preview list */}
                                {parsedEmails.length > 0 && (
                                    <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-lg p-2">
                                        {parsedEmails.map((parsed, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-center justify-between py-1 px-2 rounded text-sm"
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate">
                            {parsed.name ? `${parsed.name} (${parsed.email})` : parsed.email}
                          </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {parsed.isValid && !parsed.isDuplicate && (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                                            Valid
                                                        </Badge>
                                                    )}

                                                    {!parsed.isValid && (
                                                        <Badge variant="destructive">
                                                            Invalid
                                                        </Badge>
                                                    )}

                                                    {parsed.isDuplicate && parsed.isValid && (
                                                        <Badge variant="outline" className="text-orange-700 dark:text-orange-300">
                                                            Duplicate
                                                        </Badge>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>

                    <Button
                        onClick={handleImport}
                        disabled={validCount === 0 || isProcessing}
                    >
                        Import {validCount > 0 && `${validCount} Email${validCount !== 1 ? 's' : ''}`}
                    </Button>
                </div>

                {/* Format help */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        📋 Supported Formats:
                    </h5>
                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <div><strong>Plain text:</strong> One email per line</div>
                        <div><strong>CSV:</strong> email,name format</div>
                        <div><strong>Mixed:</strong> email followed by optional name</div>
                        <div><strong>Note:</strong> Duplicate emails will be skipped automatically</div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}