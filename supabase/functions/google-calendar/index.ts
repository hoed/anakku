import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('Google Calendar action:', action, 'user:', user.id);

    // Generate OAuth URL
    if (action === 'auth-url') {
      const redirectUri = url.searchParams.get('redirect_uri');
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!);
      authUrl.searchParams.set('redirect_uri', redirectUri!);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', user.id);

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange code for tokens
    if (action === 'exchange-code') {
      const { code, redirect_uri } = await req.json();
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      console.log('Token exchange response:', tokens.error || 'success');

      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Store tokens in database
      const { error: upsertError } = await supabase
        .from('google_calendar_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Error storing tokens:', upsertError);
        throw new Error('Failed to store tokens');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get valid access token (refresh if needed)
    const getValidToken = async () => {
      const { data: tokenData, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (tokenError || !tokenData) {
        return null;
      }

      // Check if token is expired
      if (new Date(tokenData.expires_at) <= new Date()) {
        console.log('Token expired, refreshing...');
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const newTokens = await refreshResponse.json();
        if (newTokens.error) {
          console.error('Token refresh error:', newTokens);
          return null;
        }

        const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
        await supabase
          .from('google_calendar_tokens')
          .update({
            access_token: newTokens.access_token,
            expires_at: expiresAt.toISOString(),
          })
          .eq('user_id', user.id);

        return newTokens.access_token;
      }

      return tokenData.access_token;
    };

    // Check connection status
    if (action === 'status') {
      const accessToken = await getValidToken();
      return new Response(JSON.stringify({ connected: !!accessToken }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disconnect
    if (action === 'disconnect') {
      await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List calendars
    if (action === 'list-calendars') {
      const accessToken = await getValidToken();
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Not connected to Google Calendar' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List events
    if (action === 'list-events') {
      const accessToken = await getValidToken();
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Not connected to Google Calendar' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const calendarId = url.searchParams.get('calendarId') || 'primary';
      const timeMin = url.searchParams.get('timeMin') || new Date().toISOString();
      const timeMax = url.searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
      eventsUrl.searchParams.set('timeMin', timeMin);
      eventsUrl.searchParams.set('timeMax', timeMax);
      eventsUrl.searchParams.set('singleEvents', 'true');
      eventsUrl.searchParams.set('orderBy', 'startTime');

      const response = await fetch(eventsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create event
    if (action === 'create-event') {
      const accessToken = await getValidToken();
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Not connected to Google Calendar' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { calendarId = 'primary', event } = await req.json();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      const data = await response.json();
      console.log('Event created:', data.id || data.error);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete event
    if (action === 'delete-event') {
      const accessToken = await getValidToken();
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Not connected to Google Calendar' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { calendarId = 'primary', eventId } = await req.json();

      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Google Calendar error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
