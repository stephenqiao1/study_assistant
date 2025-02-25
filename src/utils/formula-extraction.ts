/**
 * Utility functions for extracting formulas from markdown content
 */

/**
 * Extracts LaTeX formulas from markdown content
 * Detects both inline ($...$) and block ($$...$$) math expressions
 */
export function extractFormulas(markdownContent: string): Array<{
  formula: string;
  isBlock: boolean;
  surroundingText: string;
}> {
  const formulas: Array<{
    formula: string;
    isBlock: boolean;
    surroundingText: string;
  }> = [];
  
  // Extract block formulas ($$...$$)
  const blockFormulaRegex = /\$\$([\s\S]+?)\$\$/g;
  let blockMatch;
  while ((blockMatch = blockFormulaRegex.exec(markdownContent)) !== null) {
    const formula = blockMatch[1].trim();
    
    // Get surrounding text (up to 100 chars before and after) for context
    const start = Math.max(0, blockMatch.index - 100);
    const end = Math.min(markdownContent.length, blockMatch.index + blockMatch[0].length + 100);
    let surroundingText = markdownContent.substring(start, end);
    
    // Clean up the surrounding text
    surroundingText = surroundingText
      .replace(/\$\$([\s\S]+?)\$\$/g, '[FORMULA]')
      .trim();
    
    formulas.push({
      formula,
      isBlock: true,
      surroundingText
    });
  }
  
  // Extract inline formulas ($...$) - but avoid currency symbols like $50
  const inlineFormulaRegex = /(?<!\w)\$([^$\n]+?)\$/g;
  let inlineMatch;
  while ((inlineMatch = inlineFormulaRegex.exec(markdownContent)) !== null) {
    const formula = inlineMatch[1].trim();
    
    // Skip if it's likely a currency amount
    if (/^\d+(\.\d+)?$/.test(formula)) {
      continue;
    }
    
    // Get surrounding text for context
    const start = Math.max(0, inlineMatch.index - 100);
    const end = Math.min(markdownContent.length, inlineMatch.index + inlineMatch[0].length + 100);
    let surroundingText = markdownContent.substring(start, end);
    
    // Clean up the surrounding text
    surroundingText = surroundingText
      .replace(/\$([^$\n]+?)\$/g, '[FORMULA]')
      .trim();
    
    formulas.push({
      formula,
      isBlock: false,
      surroundingText
    });
  }
  
  return formulas;
}

/**
 * Attempts to categorize a formula based on its content and context
 */
export function categorizeFormula(formula: string, surroundingText: string): string {
  // Check for common formula patterns or keywords in surrounding text
  const categories: Record<string, RegExp[]> = {
    "Calculus": [
      /deriv|integr|lim|differentiat|∫|∂|dx|dy|∑|∏/i,
      /calculus|derivative|integral|limit/i
    ],
    "Algebra": [
      /linear|quadratic|polynomial|matrix|determinant|eigen|vector/i,
      /algebra|equation|solve|solution|factor/i
    ],
    "Statistics": [
      /mean|median|variance|deviation|σ|μ|probability|random|normal|distribution/i,
      /statistics|statistical|probability|variance|correlation/i
    ],
    "Physics": [
      /force|energy|momentum|velocity|acceleration|mass|gravity|pressure|joule|newton|watt/i,
      /physics|mechanics|dynamics|kinematics|relativity|quantum/i
    ],
    "Chemistry": [
      /reaction|equilibrium|molarity|concentration|pH|acid|base|electron|isotope/i,
      /chemistry|chemical|compound|molecule|atom|reaction/i
    ],
    "Geometry": [
      /triangle|circle|square|rectangle|polygon|angle|area|volume|perimeter/i,
      /geometry|geometric|trigonometry|shape|area|volume/i
    ]
  };
  
  const textToCheck = formula + ' ' + surroundingText;
  
  for (const [category, patterns] of Object.entries(categories)) {
    for (const pattern of patterns) {
      if (pattern.test(textToCheck)) {
        return category;
      }
    }
  }
  
  return "General";
} 