import { useState, useCallback } from 'react';
import { LanguageToolMatch } from '@/lib/services/languagetool/service';

interface SpellcheckResult {
  matches: LanguageToolMatch[];
  language: {
    name: string;
    code: string;
  };
}

interface UseSpellcheckReturn {
  isChecking: boolean;
  errors: LanguageToolMatch[];
  checkText: (text: string, language?: string, level?: string) => Promise<void>;
  clearErrors: () => void;
  removeError: (error: LanguageToolMatch) => void;
  errorCount: number;
}

export function useSpellcheck(): UseSpellcheckReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [errors, setErrors] = useState<LanguageToolMatch[]>([]);

  const checkText = useCallback(async (text: string, language?: string, level?: string) => {
    if (!text.trim()) {
      setErrors([]);
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch('/api/integrations/spellchecker/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language, level }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check text');
      }

      const result: SpellcheckResult = await response.json();
      setErrors(result.matches || []);
    } catch (error) {
      console.error('[Spellcheck] Error:', error);
      setErrors([]);
      throw error;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const removeError = useCallback((errorToRemove: LanguageToolMatch) => {
    setErrors(prevErrors =>
      prevErrors.filter(error =>
        error.offset !== errorToRemove.offset ||
        error.message !== errorToRemove.message
      )
    );
  }, []);

  return {
    isChecking,
    errors,
    checkText,
    clearErrors,
    removeError,
    errorCount: errors.length,
  };
}
