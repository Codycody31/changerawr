'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageToolMatch } from '@/lib/services/languagetool/service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertCircle,
  CheckCircle,
  Lightbulb,
  X,
  ChevronRight,
  BookCheck,
  Loader2
} from 'lucide-react';
import { LanguageToolLogo } from '@/lib/services/languagetool/logo';

interface SpellcheckPanelProps {
  isVisible: boolean;
  errors: LanguageToolMatch[];
  isLoading: boolean;
  onClose: () => void;
  onApplySuggestion?: (error: LanguageToolMatch, suggestion: string) => void;
  onIgnoreError?: (error: LanguageToolMatch) => void;
  level?: 'default' | 'picky';
  onLevelChange?: (level: 'default' | 'picky') => void;
}

export function SpellcheckPanel({
  isVisible,
  errors,
  isLoading,
  onClose,
  onApplySuggestion,
  onIgnoreError,
  level = 'default',
  onLevelChange
}: SpellcheckPanelProps) {
  const [filter, setFilter] = useState<'all' | 'misspelling' | 'grammar' | 'style'>('all');
  const [ignoredErrors, setIgnoredErrors] = useState<Set<string>>(new Set());

  // Reset filter when panel opens
  useEffect(() => {
    if (isVisible) {
      setFilter('all');
    }
  }, [isVisible]);

  // Categorize errors by type
  const categorizedErrors = useMemo(() => {
    const filtered = errors.filter(error => {
      const errorKey = `${error.offset}-${error.message}`;
      if (ignoredErrors.has(errorKey)) return false;
      if (filter === 'all') return true;
      return error.rule.issueType.toLowerCase() === filter;
    });

    return {
      all: filtered,
      misspelling: errors.filter(e => e.rule.issueType.toLowerCase() === 'misspelling' && !ignoredErrors.has(`${e.offset}-${e.message}`)),
      grammar: errors.filter(e => e.rule.issueType.toLowerCase() === 'grammar' && !ignoredErrors.has(`${e.offset}-${e.message}`)),
      style: errors.filter(e => e.rule.issueType.toLowerCase() === 'style' && !ignoredErrors.has(`${e.offset}-${e.message}`)),
    };
  }, [errors, filter, ignoredErrors]);

  const getIssueTypeColor = (issueType: string) => {
    switch (issueType.toLowerCase()) {
      case 'misspelling':
        return 'destructive';
      case 'grammar':
        return 'default';
      case 'style':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getIssueTypeIcon = (issueType: string) => {
    switch (issueType.toLowerCase()) {
      case 'misspelling':
        return <AlertCircle className="h-4 w-4" />;
      case 'grammar':
        return <Lightbulb className="h-4 w-4" />;
      case 'style':
        return <BookCheck className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleIgnoreError = (error: LanguageToolMatch) => {
    const errorKey = `${error.offset}-${error.message}`;
    setIgnoredErrors(prev => new Set(prev).add(errorKey));
    onIgnoreError?.(error);
  };

  // Animation variants
  const panelVariants = {
    hidden: { opacity: 0, x: '100%' },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: '100%' },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-end overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full sm:w-[450px] lg:w-[520px] bg-background border-l border-t sm:border rounded-tl-lg sm:rounded-lg shadow-2xl overflow-hidden sm:mr-6 sm:my-6 max-h-[90vh] flex flex-col h-[75vh]"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="bg-muted p-1.5 rounded-md">
                  <LanguageToolLogo className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">Grammar & Spell Checker</h2>
                    {onLevelChange && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant={level === 'default' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onLevelChange('default')}
                          className="h-6 px-2 text-xs"
                        >
                          Default
                        </Button>
                        <Button
                          variant={level === 'picky' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onLevelChange('picky')}
                          className="h-6 px-2 text-xs"
                        >
                          Picky
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isLoading ? 'Analyzing your text...' : `${categorizedErrors.all.length} ${categorizedErrors.all.length === 1 ? 'issue' : 'issues'} found`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium mb-1">Checking your text...</p>
                <p className="text-xs text-muted-foreground text-center">
                  Analyzing for spelling, grammar, and style issues
                </p>
              </div>
            )}

            {/* No Errors State */}
            {!isLoading && errors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="bg-green-500/10 p-4 rounded-full mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-base font-medium mb-1">Perfect!</p>
                <p className="text-sm text-muted-foreground text-center">
                  No spelling or grammar errors found
                </p>
              </div>
            )}

            {/* Errors Found */}
            {!isLoading && errors.length > 0 && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Category Summary */}
                <div className="p-4 space-y-3 border-b bg-muted/20">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-background">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-muted-foreground">Spelling</span>
                        <span className="text-sm font-semibold">{categorizedErrors.misspelling.length}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-background">
                      <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-muted-foreground">Grammar</span>
                        <span className="text-sm font-semibold">{categorizedErrors.grammar.length}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-background">
                      <BookCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-muted-foreground">Style</span>
                        <span className="text-sm font-semibold">{categorizedErrors.style.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-9">
                      <TabsTrigger value="all" className="text-xs px-2">
                        All
                        {categorizedErrors.all.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                            {categorizedErrors.all.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="misspelling" className="text-xs px-1">
                        Spelling
                        {categorizedErrors.misspelling.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                            {categorizedErrors.misspelling.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="grammar" className="text-xs px-1">
                        Grammar
                        {categorizedErrors.grammar.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                            {categorizedErrors.grammar.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="style" className="text-xs px-1">
                        Style
                        {categorizedErrors.style.length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                            {categorizedErrors.style.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Error List */}
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {categorizedErrors.all.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <CheckCircle className="h-10 w-10 mb-3 text-green-600" />
                        <p className="text-sm">No issues in this category</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {categorizedErrors.all.map((error, index) => {
                          const errorKey = `${error.offset}-${error.message}`;
                          if (ignoredErrors.has(errorKey)) return null;

                          return (
                            <motion.div
                              key={`${error.offset}-${index}`}
                              className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex-shrink-0">
                                  {getIssueTypeIcon(error.rule.issueType)}
                                </div>
                                <div className="flex-1 space-y-2.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={getIssueTypeColor(error.rule.issueType)} className="text-xs">
                                      {error.rule.issueType}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {error.rule.category.name}
                                    </span>
                                  </div>

                                  <p className="text-sm font-medium leading-relaxed">{error.message}</p>

                                  {error.context && (
                                    <div className="text-sm bg-muted/50 p-2.5 rounded-md border leading-relaxed">
                                      <span className="text-muted-foreground">
                                        {error.context.text.substring(0, error.context.offset)}
                                      </span>
                                      <span className="bg-destructive/20 text-destructive font-medium px-1.5 py-0.5 rounded">
                                        {error.context.text.substring(
                                          error.context.offset,
                                          error.context.offset + error.context.length
                                        )}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {error.context.text.substring(
                                          error.context.offset + error.context.length
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {error.replacements && error.replacements.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">
                                        Suggestions:
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {error.replacements.slice(0, 5).map((replacement, repIndex) => (
                                          <Button
                                            key={repIndex}
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                                            onClick={() =>
                                              onApplySuggestion?.(error, replacement.value)
                                            }
                                          >
                                            <ChevronRight className="h-3 w-3 mr-1" />
                                            {replacement.value}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={() => handleIgnoreError(error)}
                                    >
                                      Ignore
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
