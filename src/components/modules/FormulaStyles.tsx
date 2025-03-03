import React from 'react';

export default function FormulaStyles() {
  return (
    <style jsx global>{`
      .dark .katex,
      .dark .katex-display,
      .dark .katex .base,
      .dark .katex .strut,
      .dark .katex .mathit,
      .dark .katex .mathnormal,
      .dark .katex .mathbf,
      .dark .katex .amsrm,
      .dark .katex .textstyle > .mord,
      .dark .katex .textstyle > .mord > .mord,
      .dark .katex .textstyle > .mord > .mord > .mord,
      .dark .katex .textstyle > .mord > .mord > .mord > .mord,
      .dark .katex .textstyle > .mord > .mord > .mord > .mord > .mord,
      .dark .katex .mbin,
      .dark .katex .mrel,
      .dark .katex .mopen,
      .dark .katex .mclose,
      .dark .katex .mpunct,
      .dark .katex .minner,
      .dark .katex .mop,
      .dark .katex .mord.text,
      .dark .katex .mspace {
        color: white !important;
      }
      
      .dark .katex .frac-line {
        border-color: white !important;
      }
      
      .dark .katex .sqrt > .sqrt-sign {
        color: white !important;
      }
      
      .dark .katex .accent > .accent-body {
        color: white !important;
      }
      
      .dark .formula-display {
        color: white !important;
      }
      
      .dark .katex .overline .overline-line {
        border-top-color: white !important;
      }
      
      .dark .katex .underline .underline-line {
        border-bottom-color: white !important;
      }
      
      .dark .katex .stretchy {
        border-color: white !important;
        color: white !important;
      }
      
      /* Add styles for katex-wrapper class */
      .dark .katex-wrapper .katex * {
        color: white !important;
      }
    `}</style>
  );
} 