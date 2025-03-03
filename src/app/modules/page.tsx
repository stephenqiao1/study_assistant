import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ModulesClientPage from '@/components/modules/ModulesClientPage';

interface Module {
  id: string
  module_title: string
  details: {
    title: string
    content: string
    teach_backs?: Array<{
      grade: number
      timestamp: string
    }>
  }
  started_at: string
}

export default async function ModulesPage() {
  // Create the Supabase client - await is essential in Next.js 15
  const supabase = await createClient();
  
  // Get the current user - this is more secure than getSession
  const { data, error } = await supabase.auth.getUser();
  
  
  // If no user, redirect to login
  if (error || !data.user) {
    redirect('/login?from=modules');
  }
  
  
  let modules: Module[] = [];
  let isEmailVerified = false;
  let isLoadingData = false;
  
  try {
    // The user is already verified from the getUser check
    isEmailVerified = data.user.email_confirmed_at != null;
    
    // Fetch modules data
    const { data: modulesData, error: modulesError } = await supabase
      .from('study_sessions')
      .select('id, module_title, details, started_at')
      .eq('user_id', data.user.id)
      .order('started_at', { ascending: false });
      
    if (modulesError) {
      console.error('Database error:', modulesError);
      throw modulesError;
    }
    
    // Create a map to store unique modules with their latest data
    const moduleMap = new Map<string, Module>();
    (modulesData || []).forEach((module: Module) => {
      // Skip modules without an ID
      if (!module.id) {
        console.error('Found module without ID:', module);
        return;
      }
      
      if (!moduleMap.has(module.module_title) || 
          new Date(module.started_at) > new Date(moduleMap.get(module.module_title)!.started_at)) {
        moduleMap.set(module.module_title, module);
      }
    });
    
    // Convert map values to array
    modules = Array.from(moduleMap.values());
  } catch (error) {
    console.error('Error fetching modules data:', error);
    isLoadingData = false;
    // Don't redirect here - just continue with empty modules
  }
  
  // Pass data to client component
  return (
    <ModulesClientPage 
      modules={modules} 
      isLoadingData={isLoadingData} 
      isEmailVerified={isEmailVerified}
      userEmail={data.user.email || ""}
    />
  );
} 