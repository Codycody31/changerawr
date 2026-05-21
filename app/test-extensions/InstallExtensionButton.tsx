'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { InstallExtensionDialog } from '@/components/extensions/InstallExtensionDialog';

export function InstallExtensionButton() {
  const [isOpen, setIsOpen] = useState(false);

  const handleInstall = async (githubUrl: string) => {
    // Mock installation process
    // In production, this would:
    // 1. Fetch from GitHub API
    // 2. Parse and validate extension
    // 3. Write to extensionLoader.ts (requires file system access)
    // 4. Trigger rebuild
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      name: 'spoiler',
      displayName: 'Spoiler Block',
      version: '1.0.0',
      author: 'Community',
      description: 'Collapsible spoiler blocks',
      category: 'structure',
      githubUrl,
    };
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Download className="mr-2 h-4 w-4" />
        Install from GitHub
      </Button>

      <InstallExtensionDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onInstall={handleInstall}
        prefilledUrl="https://github.com/Changerawr/extension-store/tree/main/editor/spoiler"
      />
    </>
  );
}
