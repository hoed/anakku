import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const CalendarCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        setStatus('error');
        toast({
          title: 'Error',
          description: 'Gagal menghubungkan ke Google Calendar',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        navigate('/');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const redirectUri = `${window.location.origin}/calendar-callback`;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=exchange-code`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
          }
        );

        const data = await res.json();

        if (data.success) {
          setStatus('success');
          toast({
            title: 'Berhasil',
            description: 'Google Calendar berhasil terhubung!',
          });
          setTimeout(() => navigate('/'), 2000);
        } else {
          throw new Error(data.error || 'Failed to connect');
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        toast({
          title: 'Error',
          description: 'Gagal menghubungkan ke Google Calendar',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        {status === 'loading' && (
          <>
            <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              Menghubungkan ke Google Calendar...
            </h2>
            <p className="text-muted-foreground mt-2">Mohon tunggu sebentar</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold text-foreground">
              Berhasil Terhubung!
            </h2>
            <p className="text-muted-foreground mt-2">Mengalihkan ke dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground">
              Gagal Menghubungkan
            </h2>
            <p className="text-muted-foreground mt-2">Mengalihkan ke dashboard...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default CalendarCallback;
