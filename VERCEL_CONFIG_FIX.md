# Vercel Configuration Fix

## Issue

The build was failing with the following error:

```
Error: Builder returned invalid maxDuration value for Serverless Function "api/pdf-extract". 
Serverless Functions must have a maxDuration between 1 and 60 for plan hobby.
```

## Solution

The issue was that the `maxDuration` setting in `src/app/api/pdf-extract/route.ts` was set to 180 seconds (3 minutes), which exceeds the maximum allowed duration for serverless functions on Vercel's hobby plan.

### Changes Made:

1. Updated the `maxDuration` setting in `src/app/api/pdf-extract/route.ts`:
   ```typescript
   // Before
   export const maxDuration = 180; // 3 minutes
   
   // After
   export const maxDuration = 60; // Maximum allowed for hobby plan (60 seconds)
   ```

## Vercel Plan Limits

Different Vercel plans have different limits for serverless function execution:

| Plan | Maximum Duration |
|------|-----------------|
| Hobby | 60 seconds |
| Pro | 900 seconds (15 minutes) |
| Enterprise | 900 seconds (15 minutes) |

## Potential Impact

Reducing the maximum duration might affect the processing of very large PDF files. If you encounter timeout issues with large PDFs, consider:

1. Implementing chunking to process PDFs in smaller parts
2. Optimizing the PDF processing code for better performance
3. Upgrading to a Vercel Pro plan if longer processing times are necessary

## References

- [Vercel Limits Documentation](https://vercel.com/docs/concepts/limits/overview#serverless-function-execution-timeout)
- [Next.js Route Handlers Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) 