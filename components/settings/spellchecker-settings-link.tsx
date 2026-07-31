'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { LanguageToolLogo } from '@/lib/services/languagetool/logo';

interface SpellcheckerStatus {
  enabled: boolean;
  defaultLanguage: string;
  allowUserOverride: boolean;
}

interface UserPrefs {
  languageToolLanguage: string | null;
  languageToolLevel: string | null;
}

export function SpellcheckerSettingsLink() {
  const router = useRouter();
  const [status, setStatus] = useState<SpellcheckerStatus | null>(null);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statusRes, prefsRes] = await Promise.all([
          fetch('/api/integrations/spellchecker/status'),
          fetch('/api/user/settings/languagetool'),
        ]);
        if (statusRes.ok) setStatus(await statusRes.json());
        if (prefsRes.ok) {
          const data = await prefsRes.json();
          setPrefs({ languageToolLanguage: data.languageToolLanguage, languageToolLevel: data.languageToolLevel });
        }
      } catch {
        // non-critical
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading || !status?.enabled) return null;

  const language = prefs?.languageToolLanguage || status.defaultLanguage;
  const level = prefs?.languageToolLevel === 'picky' ? 'Picky' : 'Default';

  return (
    <Card
      className="border shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
      onClick={() => router.push('/dashboard/settings/spellchecker')}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push('/dashboard/settings/spellchecker')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 p-1.5 rounded-md flex-shrink-0">
              <LanguageToolLogo className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl">Spellchecker</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                {language} · {level} checking
              </CardDescription>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </CardHeader>
    </Card>
  );
}
