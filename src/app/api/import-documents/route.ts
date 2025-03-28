import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { hasSubscriptionTier } from '@/utils/subscription-helpers';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user has basic or pro subscription
    const hasPremiumAccess = await hasSubscriptionTier(user.id, 'basic') || 
                            await hasSubscriptionTier(user.id, 'pro');
    
    if (!hasPremiumAccess) {
      return NextResponse.json(
        { 
          error: 'Premium feature', 
          message: 'Document import is only available for Basic and Pro tier subscribers.' 
        },
        { status: 403 }
      );
    }
    
    // Get the request body
    const _body = await request.json();
    
    // TODO: Implement actual document import logic here
    // This is where you'll handle the file upload and processing
    
    return NextResponse.json({ 
      success: true,
      message: 'Document imported successfully'
    });
  } catch (error) {
    console.error('Error importing document:', error);
    return NextResponse.json(
      { error: 'Failed to import document' },
      { status: 500 }
    );
  }
} 