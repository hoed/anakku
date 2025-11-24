import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { childId, doctorName, doctorEmail, expiresInDays } = await req.json();

    // Generate secure token and access code
    const shareToken = crypto.randomUUID();
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

    const { data, error } = await supabaseClient
      .from('share_links')
      .insert({
        child_id: childId,
        share_token: shareToken,
        access_code: accessCode,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        doctor_name: doctorName,
        doctor_email: doctorEmail,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        shareLink: `${req.headers.get('origin')}/shared/${shareToken}`,
        accessCode,
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});