import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { count, error } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('tier', 'pro');

    if (error) {
      console.error('Error fetching subscription count:', error);
      return NextResponse.json({ error: 'Failed to fetch subscription count' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in subscription count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 