'use client';

/**
 * MmdSourceViewer - Renders Mathpix Markdown (MMD) using the official mathpix-markdown-it library.
 * 
 * This component provides full support for:
 * - LaTeX equations (inline and block)
 * - Advanced tables (LaTeX tabular syntax)
 * - Chemistry diagrams (SMILES)
 * - Figure references
 * - And all other Mathpix Markdown features
 * 
 * Used in the Source tab to display the full extracted MMD content for a session.
 * 
 * @see https://github.com/Mathpix/mathpix-markdown-it#using-mathpix-markdown-it-in-web-browsers
 */

import { useEffect, useRef, useState } from 'react';
import { MathpixMarkdownModel } from 'mathpix-markdown-it';

export interface MmdSourceViewerProps {
  /** The Mathpix Markdown content to render */
  content: string | null;
  /** Optional CSS classes for the outer container */
  className?: string;
}

/**
 * Renders Mathpix Markdown content using the official mathpix-markdown-it library.
 * This component handles all Mathpix-specific syntax including LaTeX math, tables, and chemistry.
 */
export function MmdSourceViewer({ content, className = '' }: MmdSourceViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stylesLoaded, setStylesLoaded] = useState(false);

  // Load Mathpix styles on mount
  useEffect(() => {
    // Check if styles are already loaded
    const existingStyle = document.getElementById('mathpix-styles');
    if (existingStyle) {
      setStylesLoaded(true);
      return;
    }

    // Create and inject styles
    const style = document.createElement('style');
    style.setAttribute('id', 'mathpix-styles');
    style.innerHTML = MathpixMarkdownModel.getMathpixFontsStyle() + MathpixMarkdownModel.getMathpixStyle(true);
    document.head.appendChild(style);
    setStylesLoaded(true);

    // Cleanup on unmount (optional - we keep styles for performance)
    // return () => style.remove();
  }, []);

  // Handle empty or null content
  if (!content || content.trim().length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="text-5xl mb-4">📄</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Source Content Available
        </h3>
        <p className="text-gray-600 text-center max-w-md">
          This session doesn&apos;t have any extracted content yet. Upload a document or image to extract content.
        </p>
      </div>
    );
  }

  // Render the content using MathpixMarkdownModel
  const html = MathpixMarkdownModel.render(content, {
    htmlTags: true,
    width: 800,
    breaks: true,
    typographer: true,
    linkify: true,
  });

  return (
    <div className={`mmd-source-viewer ${className}`}>
      {!stylesLoaded ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading renderer...</span>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="mmd-content overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}

export default MmdSourceViewer;
