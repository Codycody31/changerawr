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
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const languageToolSchema = z.object({
  languageToolEnabled: z.boolean(),
  languageToolApiUrl: z.string().url('Must be a valid URL').min(1, 'API URL is required'),
  languageToolApiKey: z.string().optional().default(''),
  languageToolUsername: z.string().optional().default(''),
  languageToolLanguage: z.string().min(1, 'Language code is required'),
  languageToolAllowUserOverride: z.boolean(),
});

type LanguageToolFormValues = z.infer<typeof languageToolSchema>;

interface Language {
  name: string;
  code: string;
  longCode: string;
}

// Map language codes to country codes for flags
const getCountryCode = (langCode: string): string => {
  const mapping: Record<string, string> = {
    'en-US': 'US',
    'en-GB': 'GB',
    'en-CA': 'CA',
    'en-AU': 'AU',
    'en-NZ': 'NZ',
    'de-DE': 'DE',
    'de-AT': 'AT',
    'de-CH': 'CH',
    'fr': 'FR',
    'fr-CA': 'CA',
    'es': 'ES',
    'pt-BR': 'BR',
    'pt-PT': 'PT',
    'it': 'IT',
    'nl': 'NL',
    'pl-PL': 'PL',
    'ru-RU': 'RU',
    'zh-CN': 'CN',
    'ja-JP': 'JP',
    'ca-ES': 'ES',
    'da-DK': 'DK',
    'sv': 'SE',
    'nb': 'NO',
    'uk-UA': 'UA',
    'el-GR': 'GR',
    'ar': 'SA',
    'fa': 'IR',
    'he': 'IL',
  };

  // Try exact match first
  if (mapping[langCode]) return mapping[langCode];

  // Try extracting country code from format like 'en-US'
  const parts = langCode.split('-');
  if (parts.length > 1) {
    const countryPart = parts[1].toUpperCase();
    // Validate it's a real 2-letter country code
    if (countryPart.length === 2) return countryPart;
  }

  // Default to language code as country (works for many: 'de', 'fr', 'it', etc.)
  return langCode.toUpperCase().slice(0, 2);
};

export default function LanguageToolSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);

  const form = useForm<LanguageToolFormValues>({
    resolver: zodResolver(languageToolSchema),
    defaultValues: {
      languageToolEnabled: false,
      languageToolApiUrl: 'https://api.languagetool.org/v2',
      languageToolApiKey: '',
      languageToolUsername: '',
      languageToolLanguage: 'en-US',
      languageToolAllowUserOverride: true,
    },
  });

  // Load languages from API
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await fetch('/api/languagetool/languages');
        if (response.ok) {
          const data = await response.json();
          setLanguages(data.languages || []);
        }
      } catch (error) {
        console.error('Failed to load languages:', error);
      } finally {
        setLanguagesLoading(false);
      }
    };

    loadLanguages();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/system/languagetool');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();

        startTransition(() => {
          form.reset({
            languageToolEnabled: data.languageToolEnabled || false,
            languageToolApiUrl: data.languageToolApiUrl || 'https://api.languagetool.org/v2',
            languageToolApiKey: data.languageToolApiKey || '',
            languageToolUsername: data.languageToolUsername || '',
            languageToolLanguage: data.languageToolLanguage || 'en-US',
            languageToolAllowUserOverride: data.languageToolAllowUserOverride ?? true,
          });
          setIsFormLoading(false);
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load LanguageTool settings',
          variant: 'destructive',
        });
        setIsFormLoading(false);
      }
    };

    loadSettings();
  }, [form, toast]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: LanguageToolFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/system/languagetool', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Success',
        description: 'LanguageTool settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/admin/system/languagetool', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: result.languageDetected
            ? `Connected successfully. Detected language: ${result.languageDetected}`
            : result.message,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isFormLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">LanguageTool Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure LanguageTool integration for spelling and grammar checking in the markdown editor.
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare language options for SearchableSelect
  const languageItems = languages.map((lang) => {
    const countryCode = getCountryCode(lang.longCode);
    return {
      value: lang.longCode,
      label: (
        <div className="flex items-center gap-2">
          <Flag code={countryCode} height="16" width="24" fallback={<span>🏳️</span>} />
          <span>{lang.name}</span>
        </div>
      ),
      searchValue: `${lang.name} ${lang.longCode}`,
    };
  });

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">LanguageTool Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure LanguageTool integration for spelling and grammar checking in the markdown editor.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>LanguageTool Configuration</CardTitle>
                  <CardDescription className="mt-1.5">
                    LanguageTool provides advanced spelling and grammar checking. You can use the free public API
                    or configure your own instance with an API key.
                  </CardDescription>
                </div>
                {form.watch('languageToolEnabled') ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Disabled
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!form.watch('languageToolApiKey') && (
                <Alert variant="info">
                  <AlertDescription>
                    You're using the free tier. Get an API key for premium features at{' '}
                    <a
                      href="https://languagetool.org/premium"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      LanguageTool Premium
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="languageToolEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable LanguageTool</FormLabel>
                      <FormDescription>
                        Enable spelling and grammar checking in the markdown editor
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="languageToolApiUrl"
                render={({ field }) => {
                  const isCustomUrl = field.value !== 'https://api.languagetool.org/v2';
                  return (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="https://api.languagetool.org/v2"
                            {...field}
                            className={isCustomUrl ? 'pr-32' : ''}
                          />
                          {isCustomUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                field.onChange('https://api.languagetool.org/v2');
                              }}
                              className="absolute right-0 top-0 h-full px-3 hover:bg-accent"
                            >
                              Reset to Default
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      {isCustomUrl && (
                        <Alert variant="default" className="mt-2">
                          <AlertDescription className="text-sm">
                            Using custom API URL. Make sure to test the connection after changing.
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormDescription>
                        The LanguageTool API endpoint. Use the default public API or your own instance.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="languageToolUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Premium)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter premium username" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional username for LanguageTool premium features.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="languageToolApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key (Optional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="Enter API key for premium features"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Optional API key for premium LanguageTool features. Leave empty to use the free tier.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="languageToolLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Language</FormLabel>
                    <FormControl>
                      {languagesLoading ? (
                        <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading languages...</span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select a language"
                          searchPlaceholder="Search languages..."
                          items={languageItems}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Select the default language for spell checking and grammar suggestions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="languageToolAllowUserOverride"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Allow User Overrides</FormLabel>
                      <FormDescription>
                        Allow users to set their own LanguageTool API URL, username, and API key
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={testConnection} disabled={isTesting}>
                  {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
