'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXProps {
  math: string;
  block?: boolean;
  errorColor?: string;
}

export function LaTeX({ math, block = false, errorColor = '#cc0000' }: LaTeXProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          throwOnError: false,
          errorColor,
          displayMode: block,
          trust: true,
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
      }
    }
  }, [math, block, errorColor]);

  return <div ref={containerRef} />;
}

export function processLatex(content: string): string {
  // Replace inline math: $...$ or \(...\) with <span class="math-inline" data-latex="..."></span>
  let processed = content.replace(/\\\((.*?)\\\)|\$(.*?)\$/g, (match, g1, g2) => {
    const formula = g1 || g2 || '';
    return `<span class="math-inline" data-latex="${formula.replace(/"/g, '&quot;')}"></span>`;
  });
  
  // Replace display math: $$...$$ or \[...\] with <div class="math-display" data-latex="..."></div>
  processed = processed.replace(/\\\[(.*?)\\\]|\$\$(.*?)\$\$/g, (match, g1, g2) => {
    const formula = g1 || g2 || '';
    return `<div class="math-display" data-latex="${formula.replace(/"/g, '&quot;')}"></div>`;
  });
  
  return processed;
}

export function MathRenderer({ htmlContent }: { htmlContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Find all math elements and render them
    const inlineMathElements = containerRef.current.querySelectorAll('.math-inline');
    const displayMathElements = containerRef.current.querySelectorAll('.math-display');
    
    inlineMathElements.forEach(element => {
      const latex = element.getAttribute('data-latex');
      if (latex) {
        try {
          katex.render(latex, element as HTMLElement, { 
            throwOnError: false, 
            displayMode: false
          });
        } catch (error) {
          console.error('KaTeX inline rendering error:', error);
        }
      }
    });
    
    displayMathElements.forEach(element => {
      const latex = element.getAttribute('data-latex');
      if (latex) {
        try {
          katex.render(latex, element as HTMLElement, { 
            throwOnError: false, 
            displayMode: true
          });
        } catch (error) {
          console.error('KaTeX display rendering error:', error);
        }
      }
    });
  }, [htmlContent]);
  
  return (
    <div 
      ref={containerRef} 
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
} 