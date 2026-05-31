'use client';

import { useState, useEffect, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Flag from 'react-world-flags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SearchableSelect } from '@/components/ui/searchable-select';

const DEFAULT_URL = 'https://api.languagetool.org/v2';

const schema = z.object({
  languageToolEnabled: z.boolean(),
  languageToolApiUrl: z.string().url('Must be a valid URL').min(1, 'API URL is required'),
  languageToolApiKey: z.string().optional().default(''),
  languageToolUsername: z.string().optional().default(''),
  languageToolLanguage: z.string().min(1, 'Language is required'),
  languageToolAllowUserOverride: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Language { name: string; code: string; longCode: string; }

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

export default function LanguageToolSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [savedApiUrl, setSavedApiUrl] = useState(DEFAULT_URL);
  const [testPassed, setTestPassed] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      languageToolEnabled: false,
      languageToolApiUrl: DEFAULT_URL,
      languageToolApiKey: '',
      languageToolUsername: '',
      languageToolLanguage: 'en-US',
      languageToolAllowUserOverride: true,
    },
  });

  const isEnabled = form.watch('languageToolEnabled');
  const currentApiUrl = form.watch('languageToolApiUrl');
  const isCustomUrl = currentApiUrl !== DEFAULT_URL;

  // Credentials section is only shown when the saved endpoint is known-good:
  // default URL always works; custom URL requires a successful test this session.
  const canShowCredentials = savedEnabled && (savedApiUrl === DEFAULT_URL || testPassed);

  // Reset test-passed when the user edits away from the last-saved URL
  useEffect(() => {
    if (currentApiUrl !== savedApiUrl) setTestPassed(false);
  }, [currentApiUrl, savedApiUrl]);

  // Load saved settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/admin/system/languagetool');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const url = data.languageToolApiUrl || DEFAULT_URL;
        setSavedEnabled(data.languageToolEnabled || false);
        setSavedApiUrl(url);
        startTransition(() => {
          form.reset({
            languageToolEnabled: data.languageToolEnabled || false,
            languageToolApiUrl: url,
            languageToolApiKey: data.languageToolApiKey || '',
            languageToolUsername: data.languageToolUsername || '',
            languageToolLanguage: data.languageToolLanguage || 'en-US',
            languageToolAllowUserOverride: data.languageToolAllowUserOverride ?? true,
          });
        });
      } catch {
        toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
      } finally {
        setIsFormLoading(false);
      }
    }
    loadSettings();
  }, [form, toast]);

  // Fetch language list from LT API — only makes sense once saved+enabled
  useEffect(() => {
    if (!savedEnabled || languages.length > 0) return;
    setLanguagesLoading(true);
    fetch('/api/integrations/spellchecker/languages')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setLanguages(data.languages || []))
      .catch(() => {})
      .finally(() => setLanguagesLoading(false));
  }, [savedEnabled, languages.length]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl">
        <Card><CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>You do not have permission to access this page.</CardDescription>
        </CardHeader></Card>
      </div>
    );
  }

  if (isFormLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Card><CardContent className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent></Card>
      </div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/system/languagetool', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      // If URL changed, the previous test no longer applies
      if (data.languageToolApiUrl !== savedApiUrl) setTestPassed(false);
      setSavedEnabled(data.languageToolEnabled);
      setSavedApiUrl(data.languageToolApiUrl);
      toast({ title: 'Saved', description: 'LanguageTool settings saved.' });
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

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/admin/system/languagetool', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setTestPassed(true);
        toast({
          title: 'Connection successful',
          description: result.languageDetected ? `Detected language: ${result.languageDetected}` : result.message,
        });
      } else {
        setTestPassed(false);
        toast({ title: 'Connection failed', description: result.message, variant: 'destructive' });
      }
    } catch {
      setTestPassed(false);
      toast({ title: 'Error', description: 'Failed to test connection', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const languageItems = languages.map((lang) => ({
    value: lang.longCode,
    label: (
      <div className="flex items-center gap-2">
        <Flag code={getCountryCode(lang.longCode)} height="16" width="24" fallback={<span>🏳️</span>} />
        <span>{lang.name}</span>
      </div>
    ),
    searchValue: `${lang.name} ${lang.longCode}`,
  }));

  const disabledClass = 'opacity-50 pointer-events-none select-none';

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">LanguageTool</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spelling and grammar checking for the markdown editor.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* 1. Enable */}
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="languageToolEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4">
                    <div>
                      <FormLabel className="text-base font-medium">Enable LanguageTool</FormLabel>
                      <FormDescription>
                        Activate spelling and grammar checking in the markdown editor.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 2. Endpoint — gated on isEnabled */}
          <Card className={`border shadow-sm transition-opacity ${!isEnabled ? disabledClass : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Endpoint</CardTitle>
              <CardDescription>
                {isEnabled
                  ? 'The LanguageTool API to use. Defaults to the public free API.'
                  : 'Enable LanguageTool above to configure the endpoint.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="languageToolApiUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API URL</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={DEFAULT_URL}
                          {...field}
                          disabled={!isEnabled}
                          className={isCustomUrl ? 'pr-20' : ''}
                        />
                        {isCustomUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => field.onChange(DEFAULT_URL)}
                            className="absolute right-0 top-0 h-full px-3 hover:bg-accent text-xs"
                            tabIndex={!isEnabled ? -1 : undefined}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Test connection — lives here, next to the URL */}
              <div className="flex items-center gap-3">
                {isEnabled && !savedEnabled && (
                  <p className="text-xs text-muted-foreground flex-1">Save first to test.</p>
                )}
                {savedEnabled && isCustomUrl && currentApiUrl === savedApiUrl && testPassed && (
                  <span className="flex items-center gap-1 text-xs text-green-600 flex-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connection verified
                  </span>
                )}
                {savedEnabled && isCustomUrl && currentApiUrl === savedApiUrl && !testPassed && (
                  <p className="text-xs text-muted-foreground flex-1">
                    Test the connection to unlock credential settings.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testConnection}
                  disabled={!savedEnabled || isTesting}
                >
                  {isTesting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Test connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 3. Credentials — only shown when connection is known-good */}
          {canShowCredentials && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Credentials</CardTitle>
                <CardDescription>
                  Optional username and API key for a paid LanguageTool account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="languageToolUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Your account username" {...field} />
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

          {/* 4. Defaults — gated on isEnabled */}
          <Card className={`border shadow-sm transition-opacity ${!isEnabled ? disabledClass : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Defaults</CardTitle>
              <CardDescription>
                System-wide defaults that apply to all users.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="languageToolLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default language</FormLabel>
                    <FormControl>
                      {languagesLoading ? (
                        <Skeleton className="h-10 w-full" />
                      ) : languages.length > 0 ? (
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select a language"
                          searchPlaceholder="Search languages…"
                          items={languageItems}
                        />
                      ) : (
                        <Input
                          placeholder="e.g. en-US"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={!isEnabled}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Users can override this in their own spellchecker settings.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="languageToolAllowUserOverride"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <FormLabel className="text-sm font-medium">Allow user overrides</FormLabel>
                      <FormDescription>
                        Let users supply their own API URL, username, and key.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isEnabled} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
