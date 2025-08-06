// components/markdown-editor/modals/CUMAlertModal.tsx

'use client';

import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Eye, AlertTriangle, Info, CheckCircle, XCircle, Lightbulb} from 'lucide-react';
import {CUMModalProps, CUMAlertConfig} from '@/components/markdown-editor/types/cum-extensions';

const alertTypes = [
    {value: 'info', label: 'Info', icon: Info, color: 'bg-blue-50 border-blue-200 text-blue-800'},
    {value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'bg-yellow-50 border-yellow-200 text-yellow-800'},
    {value: 'error', label: 'Error', icon: XCircle, color: 'bg-red-50 border-red-200 text-red-800'},
    {value: 'success', label: 'Success', icon: CheckCircle, color: 'bg-green-50 border-green-200 text-green-800'},
    {value: 'tip', label: 'Tip', icon: Lightbulb, color: 'bg-purple-50 border-purple-200 text-purple-800'},
] as const;

export const CUMAlertModal: React.FC<CUMModalProps> = ({
                                                           isOpen,
                                                           onClose,
                                                           onInsert,
                                                       }) => {
    const [config, setConfig] = useState<CUMAlertConfig>({
        type: 'info',
        title: '',
        content: 'Your alert message goes here...',
        dismissible: false,
    });

    const [preview, setPreview] = useState(false);

    const handleInsert = () => {
        const titleLine = config.title ? ` ${config.title}` : '';
        const markdown = `:::${config.type}${titleLine}\n${config.content}\n:::`;

        onInsert(markdown);
        onClose();
    };

    const handleReset = () => {
        setConfig({
            type: 'info',
            title: '',
            content: 'Your alert message goes here...',
            dismissible: false,
        });
    };

    const selectedType = alertTypes.find(type => type.value === config.type);
    const previewMarkdown = `:::${config.type}${config.title ? ` ${config.title}` : ''}\n${config.content}\n:::`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-2xl">⚠️</span>
                        Create Alert
                    </DialogTitle>
                    <DialogDescription>
                        Create a styled alert box to highlight important information, warnings, or tips.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Alert Type */}
                    <div className="grid gap-2">
                        <Label>Alert Type</Label>
                        <div className="grid grid-cols-5 gap-2">
                            {alertTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <Button
                                        key={type.value}
                                        variant={config.type === type.value ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setConfig(prev => ({...prev, type: type.value}))}
                                        className="flex flex-col gap-1 h-auto py-3"
                                    >
                                        <Icon className="w-4 h-4"/>
                                        <span className="text-xs">{type.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Title (Optional) */}
                    <div className="grid gap-2">
                        <Label htmlFor="alert-title">Title (Optional)</Label>
                        <Input
                            id="alert-title"
                            value={config.title}
                            onChange={(e) => setConfig(prev => ({...prev, title: e.target.value}))}
                            placeholder="Leave empty to use default title..."
                        />
                    </div>

                    {/* Content */}
                    <div className="grid gap-2">
                        <Label htmlFor="alert-content">Alert Content</Label>
                        <Textarea
                            id="alert-content"
                            value={config.content}
                            onChange={(e) => setConfig(prev => ({...prev, content: e.target.value}))}
                            placeholder="Enter your alert message..."
                            rows={4}
                        />
                    </div>

                    {/* Preview */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label>Preview</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreview(!preview)}
                            >
                                <Eye className="w-4 h-4 mr-1"/>
                                {preview ? 'Hide' : 'Show'} Markdown
                            </Button>
                        </div>

                        {preview ? (
                            <div className="p-3 bg-muted rounded-md font-mono text-sm whitespace-pre-wrap">
                                {previewMarkdown}
                            </div>
                        ) : (
                            <div className={`border-l-4 p-4 rounded-md ${selectedType?.color}`}>
                                <div className="flex items-center gap-2 font-medium mb-2">
                                    {selectedType && <selectedType.icon className="w-4 h-4"/>}
                                    {config.title || selectedType?.label}
                                </div>
                                <div className="text-sm">
                                    {config.content}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Templates */}
                    <div className="grid gap-2">
                        <Label>Quick Templates</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfig(prev => ({
                                    ...prev,
                                    type: 'warning',
                                    title: 'Breaking Change',
                                    content: 'This update includes breaking changes. Please review the migration guide before upgrading.'
                                }))}
                            >
                                Breaking Change
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfig(prev => ({
                                    ...prev,
                                    type: 'tip',
                                    title: 'Pro Tip',
                                    content: 'You can use keyboard shortcuts to speed up your workflow. Press Ctrl+K to open the command palette.'
                                }))}
                            >
                                Pro Tip
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfig(prev => ({
                                    ...prev,
                                    type: 'info',
                                    title: 'New Feature',
                                    content: 'We\'ve added a new feature that makes it easier to collaborate with your team.'
                                }))}
                            >
                                New Feature
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfig(prev => ({
                                    ...prev,
                                    type: 'error',
                                    title: 'Known Issue',
                                    content: 'We\'re aware of an issue that may affect some users. We\'re working on a fix and will update this page when it\'s resolved.'
                                }))}
                            >
                                Known Issue
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleReset}>
                        Reset
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleInsert}>
                        Insert Alert
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};