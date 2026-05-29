'use client';

import { useState, useEffect, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Flag from 'react-world-flags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { LanguageToolLogo } from '@/lib/services/languagetool/logo';

const userLanguageToolSchema = z.object({
  languageToolLanguage: z.string().nullable(),
  languageToolLevel: z.string().default('default'),
  languageToolMotherTongue: z.string().nullable(),
  languageToolApiUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  languageToolUsername: z.string().optional(),
  languageToolApiKey: z.string().optional(),
});

type UserLanguageToolFormValues = z.infer<typeof userLanguageToolSchema>;

interface Language {
  name: string;
  code: string;
  longCode: string;
}

interface SystemConfig {
  languageToolEnabled: boolean;
  languageToolAllowUserOverride: boolean;
  languageToolLanguage: string;
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

export default function UserLanguageToolSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  const form = useForm<UserLanguageToolFormValues>({
    resolver: zodResolver(userLanguageToolSchema),
    defaultValues: {
      languageToolLanguage: null,
      languageToolLevel: 'default',
      languageToolMotherTongue: null,
      languageToolApiUrl: '',
      languageToolUsername: '',
      languageToolApiKey: '',
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

  // Check if LanguageTool is enabled and load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Check system config first
        const systemResponse = await fetch('/api/admin/system/languagetool');
        if (systemResponse.ok) {
          const systemData = await systemResponse.json();
          setSystemConfig(systemData);

          if (!systemData.languageToolEnabled) {
            setIsFormLoading(false);
            return;
          }
        }

        // Load user settings
        const userResponse = await fetch('/api/user/settings/languagetool');
        if (!userResponse.ok) throw new Error('Failed to fetch user settings');
        const userData = await userResponse.json();

        startTransition(() => {
          form.reset({
            languageToolLanguage: userData.languageToolLanguage || null,
            languageToolLevel: userData.languageToolLevel || 'default',
            languageToolMotherTongue: userData.languageToolMotherTongue || null,
            languageToolApiUrl: userData.languageToolApiUrl || '',
            languageToolUsername: userData.languageToolUsername || '',
            languageToolApiKey: userData.languageToolApiKey || '',
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

  const onSubmit = async (data: UserLanguageToolFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/settings/languagetool', {
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
        description: 'Your LanguageTool preferences have been saved successfully',
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

  if (isFormLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">LanguageTool Preferences</h1>
          <p className="text-muted-foreground mt-2">
            Customize your spelling and grammar checking preferences.
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

  // If LanguageTool is not enabled system-wide
  if (!systemConfig?.languageToolEnabled) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">LanguageTool Preferences</h1>
          <p className="text-muted-foreground mt-2">
            Customize your spelling and grammar checking preferences.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>LanguageTool Not Enabled</CardTitle>
            <CardDescription>
              LanguageTool spelling and grammar checking is not currently enabled on this system.
              Please contact your administrator if you would like to use this feature.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Prepare language options for SearchableSelect
  const languageItems = [
    {
      value: '',
      label: <span className="text-muted-foreground">Use System Default ({systemConfig?.languageToolLanguage || 'en-US'})</span>,
      searchValue: 'system default',
    },
    ...languages.map((lang) => {
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
    }),
  ];

  const allowOverride = systemConfig?.languageToolAllowUserOverride ?? false;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 max-w-4xl">
        {/* Header with branding */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-primary/10 p-3 rounded-lg">
              <LanguageToolLogo className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Spellchecker Settings</h1>
              <p className="text-muted-foreground mt-1">
                Powered by LanguageTool
              </p>
            </div>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Customize your spelling and grammar checking preferences. Changes are saved automatically when you click Save Preferences.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Language Preferences</CardTitle>
                <CardDescription>
                  Configure which language to check and your native language for better suggestions
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="languageToolLanguage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Language</FormLabel>
                    <FormControl>
                      {languagesLoading ? (
                        <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading languages...</span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={(value) => field.onChange(value || null)}
                          placeholder="Select a language"
                          searchPlaceholder="Search languages..."
                          items={languageItems}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Select your preferred language for spell checking. Leave as system default to use the administrator's configured language.
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
                    <FormLabel>Mother Tongue (Optional)</FormLabel>
                    <FormControl>
                      {languagesLoading ? (
                        <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading languages...</span>
                        </div>
                      ) : (
                        <SearchableSelect
                          value={field.value || ''}
                          onValueChange={(value) => field.onChange(value || null)}
                          placeholder="Select your native language"
                          searchPlaceholder="Search languages..."
                          items={[
                            {
                              value: '',
                              label: <span className="text-muted-foreground">None</span>,
                              searchValue: 'none',
                            },
                            ...languages.map((lang) => {
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
                            }),
                          ]}
                        />
                      )}
                    </FormControl>
                    <FormDescription>
                      Your native language. This helps LanguageTool provide better suggestions for non-native speakers.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="languageToolLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Checking Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select checking level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="default">Default - Standard checking</SelectItem>
                        <SelectItem value="picky">Picky - More strict checking</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose how strict the grammar and style checking should be. Picky mode will flag more potential issues.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {allowOverride && (
            <Card className="border-2 border-dashed">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Advanced Settings</CardTitle>
                <CardDescription>
                  Override system settings with your own LanguageTool API credentials (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Optional Settings</AlertTitle>
                  <AlertDescription>
                    These settings are optional and will override the system defaults. Only configure these if you have your own LanguageTool API credentials.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="languageToolApiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom API URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://api.languagetool.org/v2"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty to use the system default API URL.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="languageToolUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username (Premium)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your premium username" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your LanguageTool premium username, if you have one.
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
                      <FormLabel>API Key (Premium)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="Enter your API key"
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
                        Your LanguageTool API key for premium features.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between p-6 bg-muted/30 rounded-lg border-2">
            <div className="flex-1">
              <p className="font-medium">Ready to save your preferences?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your settings will apply to all spell checking throughout the app
              </p>
            </div>
            <Button type="submit" disabled={isLoading} size="lg" className="ml-4">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
}
