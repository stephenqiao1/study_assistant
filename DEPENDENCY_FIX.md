# Dependency Fix for Vercel Build

## Issue

The build was failing with the following error:

```
npm error While resolving: react-katex@3.0.1
npm error Found: react@19.0.0
npm error node_modules/react
npm error   react@"^19.0.0" from the root project
...
npm error Could not resolve dependency:
npm error peer react@">=15.3.2 <=18" from react-katex@3.0.1
```

## Solution

The issue was that `react-katex` only supports React up to version 18, but the project was using React 19.

### Changes Made:

1. Downgraded React from v19 to v18.3.1:
   ```json
   "react": "^18.3.1",
   "react-dom": "^18.3.1",
   ```

2. Updated React type definitions to match:
   ```json
   "@types/react": "^18",
   "@types/react-dom": "^18",
   ```

### Alternative Solutions (Not Implemented):

1. Replace `react-katex` with a newer alternative that supports React 19
2. Use `--force` or `--legacy-peer-deps` with npm install (not recommended for production)
3. Fork and update `react-katex` to support React 19

### Why This Approach:

Downgrading React was the simplest solution that ensures all dependencies work together correctly. React 18.3.1 is still a modern version with good feature support and performance.

## Future Considerations

When `react-katex` is updated to support React 19, or if you decide to replace it with an alternative library, you can update the React version back to 19. 