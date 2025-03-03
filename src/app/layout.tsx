import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Academiq",
  description: "Your AI-powered learning companion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Suppress React hydration warnings */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Save original console.error
              const originalConsoleError = console.error;
              
              // Override console.error to filter hydration warnings
              console.error = (...args) => {
                // Check if this is a hydration warning
                if (typeof args[0] === 'string' && (
                  args[0].includes('Hydration failed because') ||
                  args[0].includes('Warning: Prop') ||
                  args[0].includes('Warning: Extra attributes') ||
                  args[0].includes('A tree hydrated but some attributes') ||
                  args[0].includes('fdprocessedid') ||
                  args[0].includes('There was an error while hydrating')
                )) {
                  // Skip logging hydration warnings
                  return;
                }
                
                // Pass through all other errors
                originalConsoleError.apply(console, args);
              };
            })();
          `
        }} />
        
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Remove fdprocessedid attributes immediately
              function removeProcessedIds() {
                document.querySelectorAll('[fdprocessedid]').forEach(el => {
                  el.removeAttribute('fdprocessedid');
                });
              }
              
              // Remove on DOMContentLoaded
              document.addEventListener('DOMContentLoaded', removeProcessedIds);
              
              // Remove on load
              window.addEventListener('load', removeProcessedIds);
              
              // Set up a MutationObserver to continuously remove fdprocessedid attributes
              // This is necessary because browser extensions might add them after initial load
              try {
                const observer = new MutationObserver((mutations) => {
                  let needsCleanup = false;
                  
                  // Check if any mutations added fdprocessedid attributes
                  mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'fdprocessedid') {
                      needsCleanup = true;
                    }
                  });
                  
                  // Only run the cleanup if needed
                  if (needsCleanup) {
                    removeProcessedIds();
                  }
                });
                
                // Start observing the document with the configured parameters
                observer.observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: ['fdprocessedid']
                });
                
                // Also run cleanup periodically for safety
                setInterval(removeProcessedIds, 100);
              } catch (e) {
                // Fallback to interval-based cleanup if MutationObserver fails
                setInterval(removeProcessedIds, 100);
              }
            })();
          `
        }} />
        
        {/* Add style to hide fdprocessedid attributes from React hydration */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Hide fdprocessedid attributes from React hydration */
            [fdprocessedid] {
              visibility: inherit !important;
            }
            
            /* Hide hydration warning elements */
            [data-mismatch="true"] {
              display: none !important;
            }
            
            /* Prevent UI flicker during hydration */
            @keyframes hydration-fix {
              from { opacity: 0.99; }
              to { opacity: 1; }
            }
            
            body {
              animation: hydration-fix 0.01s;
              animation-fill-mode: forwards;
            }
          `
        }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
