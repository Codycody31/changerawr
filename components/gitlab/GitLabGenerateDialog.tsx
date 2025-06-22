'use client';

import React from 'react';
import GitProviderGenerateDialog from '@/components/GitProviderGenerateDialog';

interface Props {
    projectId: string;
    onGenerated: (content: string, version?: string) => void;
    trigger?: React.ReactNode;
}

export default function GitLabGenerateDialog(props: Props) {
    return <GitProviderGenerateDialog {...props} integration="gitlab" />;
} 