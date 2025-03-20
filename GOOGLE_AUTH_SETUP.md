# Google Authentication Setup Guide

This guide will walk you through setting up Google OAuth authentication for your Supabase project.

## Step 1: Set Up Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to "APIs & Services" > "OAuth consent screen".
4. Select "External" user type (unless you're using Google Workspace).
5. Fill in the required information:
   - App name
   - User support email
   - Developer contact information
6. Click "Save and Continue".
7. Add the following scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
8. Click "Save and Continue".
9. Add test users if needed (not required for production).
10. Click "Save and Continue" to complete the consent screen setup.

## Step 2: Create OAuth Credentials

1. In the Google Cloud Console, go to "APIs & Services" > "Credentials".
2. Click "Create Credentials" and select "OAuth client ID".
3. For Application type, select "Web application".
4. Give your client a name (e.g., "Academiq Web App").
5. Under "Authorized JavaScript origins", add:
   - Your production URL (e.g., `https://yourdomain.com`)
   - Your development URL (e.g., `http://localhost:3000`)
6. Under "Authorized redirect URIs", add:
   - Production: `https://yourdomain.com/auth/callback`
   - Development: `http://localhost:3000/auth/callback`
   - Supabase URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
7. Click "Create".
8. You'll receive a **Client ID** and **Client Secret**. Save these for the next step.

## Step 3: Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.io/).
2. Select your project.
3. Navigate to "Authentication" > "Providers".
4. Find "Google" in the list and click on it.
5. Toggle the "Enable" switch to ON.
6. Enter the **Client ID** and **Client Secret** from the previous step.
7. Save the changes.

## Step 4: Environment Variables

Make sure your application has the following environment variables set:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Step 5: Testing

1. Start your application.
2. Go to the login page.
3. Click "Continue with Google".
4. You should be redirected to Google's consent screen.
5. After granting permission, you should be redirected back to your application and logged in.

## Troubleshooting

- **Redirect URI Mismatch**: Ensure that the redirect URI in your Google Cloud Console matches exactly with the one Supabase is using.
- **CORS Issues**: Make sure your domain is added to the authorized JavaScript origins.
- **Consent Screen Not Verified**: For testing, you can add yourself as a test user. For production, you may need to verify your app with Google.
- **Error Logs**: Check the browser console and server logs for specific error messages.

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2) 