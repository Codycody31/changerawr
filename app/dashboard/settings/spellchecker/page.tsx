'use client';

import { useState, useEffect, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Flag from 'react-world-flags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { LanguageToolLogo } from '@/lib/services/languagetool/logo';

const schema = z.object({
  languageToolLanguage: z.string().nullable(),
  languageToolLevel: z.string().default('default'),
  languageToolMotherTongue: z.string().nullable(),
  languageToolApiUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  languageToolUsername: z.string().optional(),
  languageToolApiKey: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Language {
  name: string;
  code: string;
  longCode: string;
}

interface SpellcheckerStatus {
  enabled: boolean;
  defaultLanguage: string;
  allowUserOverride: boolean;
}

const getCountryCode = (langCode: string): string => {
  const mapping: Record<string, string> = {
    'en-US': 'US', 'en-GB': 'GB', 'en-CA': 'CA', 'en-AU': 'AU', 'en-NZ': 'NZ',
    'de-DE': 'DE', 'de-AT': 'AT', 'de-CH': 'CH', 'fr': 'FR', 'fr-CA': 'CA',
    'es': 'ES', 'pt-BR': 'BR', 'pt-PT': 'PT', 'it': 'IT', 'nl': 'NL',
    'pl-PL': 'PL', 'ru-RU': 'RU', 'zh-CN': 'CN', 'ja-JP': 'JP',
    'ca-ES': 'ES', 'da-DK': 'DK', 'sv': 'SE', 'nb': 'NO',
    'uk-UA': 'UA', 'el-GR': 'GR', 'ar': 'SA', 'fa': 'IR', 'he': 'IL',
  };
  if (mapping[langCode]) return mapping[langCode];
  const parts = langCode.split('-');
  if (parts.length > 1 && parts[1].length === 2) return parts[1].toUpperCase();
  return langCode.toUpperCase().slice(0, 2);
};

function LanguageOption({ lang }: { lang: Language }) {
  return (
    <div className="flex items-center gap-2">
      <Flag code={getCountryCode(lang.longCode)} height="16" width="24" fallback={<span>🏳️</span>} />
      <span>{lang.name}</span>
    </div>
  );
}

export default function SpellcheckerSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [status, setStatus] = useState<SpellcheckerStatus | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      languageToolLanguage: null,
      languageToolLevel: 'default',
      languageToolMotherTongue: null,
      languageToolApiUrl: '',
      languageToolUsername: '',
      languageToolApiKey: '',
    },
  });

  useEffect(() => {
    async function load() {
      try {
        const [statusRes, userRes] = await Promise.all([
          fetch('/api/integrations/spellchecker/status'),
          fetch('/api/user/settings/languagetool'),
        ]);

        if (statusRes.ok) {
          const s: SpellcheckerStatus = await statusRes.json();
          setStatus(s);
          if (!s.enabled) { setIsLoading(false); return; }
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          startTransition(() => {
            form.reset({
              languageToolLanguage: userData.languageToolLanguage || null,
              languageToolLevel: userData.languageToolLevel || 'default',
              languageToolMotherTongue: userData.languageToolMotherTongue || null,
              languageToolApiUrl: userData.languageToolApiUrl || '',
              languageToolUsername: userData.languageToolUsername || '',
              languageToolApiKey: userData.languageToolApiKey || '',
            });
          });
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }

      try {
        const langRes = await fetch('/api/integrations/spellchecker/languages');
        if (langRes.ok) {
          const data = await langRes.json();
          setLanguages(data.languages || []);
        }
      } catch {
        // non-critical, leave empty
      } finally {
        setLanguagesLoading(false);
      }
    }

    load();
  }, [form, toast]);

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/settings/languagetool', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      toast({ title: 'Saved', description: 'Spellchecker preferences updated.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Card className="border shadow-sm">
          <CardContent className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status?.enabled) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground" onClick={() => router.back()}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Settings
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Spellchecker</h1>
        </div>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Not enabled</CardTitle>
            <CardDescription>
              Spellchecking is not enabled on this instance. Contact your administrator to enable it.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const languageItems = [
    {
      value: '',
      label: <span className="text-muted-foreground">System default ({status.defaultLanguage})</span>,
      searchValue: 'system default',
    },
    ...languages.map((lang) => ({
      value: lang.longCode,
      label: <LanguageOption lang={lang} />,
      searchValue: `${lang.name} ${lang.longCode}`,
    })),
  ];

  const motherTongueItems = [
    { value: '', label: <span className="text-muted-foreground">None</span>, searchValue: 'none' },
    ...languages.map((lang) => ({
      value: lang.longCode,
      label: <LanguageOption lang={lang} />,
      searchValue: `${lang.name} ${lang.longCode}`,
    })),
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Settings
        </Button>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-lg">
            <LanguageToolLogo className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Spellchecker</h1>
            <p className="text-sm text-muted-foreground">Powered by LanguageTool</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Language preferences */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Language</CardTitle>
              <CardDescription>
                Which language to check and your native language for better suggestions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="languageToolLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred language</FormLabel>
                    <FormControl>
                      {languagesLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={(v) => field.onChange(v || null)}
                          placeholder="Select a language"
                          searchPlaceholder="Search languages…"
                          items={languageItems}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Leave blank to use the system default.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="languageToolMotherTongue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Mother tongue{' '}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      {languagesLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={(v) => field.onChange(v || null)}
                          placeholder="Select your native language"
                          searchPlaceholder="Search languages…"
                          items={motherTongueItems}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Helps LanguageTool give better suggestions for non-native speakers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Checking level */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Checking level</CardTitle>
              <CardDescription>
                How strictly grammar and style should be evaluated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="languageToolLevel"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select checking level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Default — standard checking</SelectItem>
                        <SelectItem value="picky">Picky — stricter checking</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Advanced / API credentials override */}
          {status.allowUserOverride && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Advanced</CardTitle>
                <CardDescription>
                  Override the system API credentials with your own LanguageTool Premium account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Alert variant="info">
                  <AlertTitle>Optional</AlertTitle>
                  <AlertDescription>
                    Leave these blank to use the system defaults. Only fill them in if you have your own LanguageTool credentials.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="languageToolApiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.languagetool.org/v2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="languageToolUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Your premium username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="languageToolApiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API key</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="Your API key"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowApiKey((v) => !v)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving…' : 'Save preferences'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
