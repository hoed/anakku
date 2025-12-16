import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useGoogleCalendarSync = () => {
  const { toast } = useToast();

  const checkCalendarConnection = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=status`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await res.json();
      return data.connected;
    } catch {
      return false;
    }
  };

  const syncToCalendar = async (
    summary: string,
    description: string,
    date: string,
    childName?: string
  ): Promise<boolean> => {
    try {
      const isConnected = await checkCalendarConnection();
      if (!isConnected) {
        return false;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const startDateTime = new Date(`${date}T09:00:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const eventData = {
        summary: childName ? `[${childName}] ${summary}` : summary,
        description,
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() },
      };

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=create-event`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ event: eventData }),
        }
      );

      const data = await res.json();
      
      if (data.id) {
        toast({
          title: '📅 Disinkronkan ke Calendar',
          description: `"${summary}" ditambahkan ke Google Calendar`,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Calendar sync error:', error);
      return false;
    }
  };

  return { syncToCalendar, checkCalendarConnection };
};
