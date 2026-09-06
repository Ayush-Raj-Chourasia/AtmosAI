'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BookOpen, Loader2, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

type Source = {
  id: string;
  title: string;
};

type AskResponse = {
  answer: string;
  sources: Source[];
  confidence: number;
  suggested_action?: string;
};

export default function GuideAISearch() {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`${API_BASE_URL}/guides/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query.trim(),
          lang: language === 'id' ? 'id' : 'en',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('Ask error:', err);
      setError(
        language === 'id'
          ? 'Gagal mendapatkan jawaban. Silakan coba lagi.'
          : 'Failed to get answer. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResponse(null);
    setError(null);
    sessionStorage.removeItem('guide_ai_state');
    inputRef.current?.focus();
  };

  // Load state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('guide_ai_state');
      if (saved) {
        try {
          const { query: savedQuery, response: savedResponse } = JSON.parse(saved);
          setQuery(savedQuery || '');
          setResponse(savedResponse);
        } catch (e) {
          console.error('Failed to parse saved state', e);
        }
      }
    }
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (query || response) {
        sessionStorage.setItem('guide_ai_state', JSON.stringify({ query, response }));
      }
    }
  }, [query, response]);

  // Auto-focus on mount only if no saved query
  useEffect(() => {
    // Don't auto-focus on mobile to prevent keyboard popup
    // Also skip if we restored a query (to prevent jumps)
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && !sessionStorage.getItem('guide_ai_state')) {
      inputRef.current?.focus();
    }
  }, []);

  return (
    <div className="mb-4">
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-3 border border-blue-100">
          <Sparkles className="text-blue-500 shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              language === 'id'
                ? 'Tanya tentang keselamatan bencana...'
                : 'Ask about disaster safety...'
            }
            className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-sm outline-none"
            disabled={isLoading}
          />
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>

      {/* Response */}
      {(response || error || isLoading) && (
        <div className="mt-3 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {isLoading && (
            <div className="p-4 flex items-center gap-3 text-slate-500">
              <Loader2 size={18} className="animate-spin text-blue-500" />
              <span className="text-sm">
                {language === 'id' ? 'Mencari jawaban...' : 'Finding answer...'}
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 text-red-600 text-sm">{error}</div>
          )}

          {response && !isLoading && (
            <div className="p-4">
              {/* Suggested Action Banner */}
              {response.suggested_action && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-medium text-amber-800">
                    ⚠️ {response.suggested_action}
                  </p>
                </div>
              )}

              {/* Answer */}
              <div className="prose prose-sm prose-slate max-w-none">
                <MarkdownRenderer content={response.answer} />
              </div>

              {/* Sources */}
              {response.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                    {language === 'id' ? 'Sumber' : 'Sources'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source) => (
                      <Link
                        key={source.id}
                        href={`/guides/${source.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-xs font-medium text-slate-600 transition-colors"
                      >
                        <BookOpen size={12} />
                        {source.title}
                        <ChevronRight size={12} />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
