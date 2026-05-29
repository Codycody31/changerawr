'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookCheck, ChevronRight } from 'lucide-react';

export function SpellcheckerSettingsLink() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkLanguageToolStatus() {
      try {
        const response = await fetch('/api/admin/system/languagetool');
        if (response.ok) {
          const data = await response.json();
          setIsEnabled(data.languageToolEnabled || false);
        } else {
          setIsEnabled(false);
        }
      } catch (error) {
        console.error('Failed to fetch LanguageTool status:', error);
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkLanguageToolStatus();
  }, []);

  // Don't render anything while loading
  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't render if not enabled
  if (!isEnabled) {
    return null;
  }

  return (
    <Card className="border shadow-sm hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-md">
            <BookCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg md:text-xl">Spellchecker</CardTitle>
            <CardDescription className="text-sm mt-1">
              Configure spell checking and grammar preferences
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="w-full justify-between group hover:bg-primary/5"
          onClick={() => router.push('/dashboard/settings/spellchecker')}
        >
          <span className="font-medium">Configure Settings</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
