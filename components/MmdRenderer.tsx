'use client';

// TODO: Replace this fallback renderer with Mathpix's mathpix-markdown-it
// so that equations, tables, and chemistry are rendered natively.
// See: https://github.com/Mathpix/mathpix-markdown-it#using-mathpix-markdown-it-in-web-browsers

import ReactMarkdown from 'react-markdown';

export interface MmdRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders Mathpix Markdown (MMD) content in the browser.
 * 
 * Currently uses react-markdown as a fallback. This should be replaced with
 * Mathpix's mathpix-markdown-it for full support of:
 * - LaTeX equations
 * - Advanced tables
 * - Chemistry diagrams (SMILES)
 * - Figure references
 * 
 * @param content - The MMD content string to render
 * @param className - Optional CSS classes to apply to the container
 */
export function MmdRenderer({ content, className = '' }: MmdRendererProps) {
  // Handle empty or whitespace-only content
  if (!content || content.trim().length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No content yet.
      </div>
    );
  }

  // Render using react-markdown (fallback implementation)
  // This handles basic markdown but not Mathpix-specific features
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          // Customize code blocks to preserve formatting
          code: ({ className, children, ...props }: any) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-gray-100 p-4 rounded overflow-x-auto" {...props}>
                {children}
              </code>
            );
          },
          // Customize headings
          h1: ({ ...props }: any) => (
            <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />
          ),
          h2: ({ ...props }: any) => (
            <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />
          ),
          h3: ({ ...props }: any) => (
            <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
          ),
          // Customize lists
          ul: ({ ...props }: any) => (
            <ul className="list-disc list-inside space-y-1 my-4" {...props} />
          ),
          ol: ({ ...props }: any) => (
            <ol className="list-decimal list-inside space-y-1 my-4" {...props} />
          ),
          // Customize paragraphs
          p: ({ ...props }: any) => (
            <p className="my-3 leading-relaxed" {...props} />
          ),
          // Customize blockquotes
          blockquote: ({ ...props }: any) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4" {...props} />
          ),
          // Customize tables
          table: ({ ...props }: any) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300" {...props} />
            </div>
          ),
          th: ({ ...props }: any) => (
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold" {...props} />
          ),
          td: ({ ...props }: any) => (
            <td className="border border-gray-300 px-4 py-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

