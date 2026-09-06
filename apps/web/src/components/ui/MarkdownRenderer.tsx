import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  if (!content) return null;

  return (
    <div className={cn("text-slate-700 leading-relaxed", className)}>
      <ReactMarkdown
        components={{
          h1: ({ ref, ...props }) => <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-3" {...props} />,
          h2: ({ ref, ...props }) => <h2 className="text-xl font-bold text-slate-900 mt-5 mb-2" {...props} />,
          h3: ({ ref, ...props }) => <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2" {...props} />,
          ul: ({ ref, ...props }) => <ul className="list-disc pl-5 space-y-1 my-3 marker:text-slate-400" {...props} />,
          ol: ({ ref, ...props }) => <ol className="list-decimal pl-5 space-y-1 my-3 marker:text-slate-400" {...props} />,
          li: ({ ref, ...props }) => <li className="pl-1" {...props} />,
          p: ({ ref, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
          strong: ({ ref, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
          a: ({ ref, ...props }) => <a className="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
          blockquote: ({ ref, ...props }) => <blockquote className="border-l-4 border-blue-200 pl-4 py-1 my-4 bg-blue-50/50 rounded-r" {...props} />,
          code: ({ ref, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '')
            return !match ? (
              <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto my-4 text-sm font-mono">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
