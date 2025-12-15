import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Trash2, RefreshCw, Link2, Unlink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

interface GoogleCalendarProps {
  childId?: string;
  childName?: string;
}

export const GoogleCalendar = ({ childId, childName }: GoogleCalendarProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    date: '',
    time: '09:00',
  });
  const { toast } = useToast();

  const checkConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
      setIsConnected(data.connected);
      
      if (data.connected) {
        loadEvents();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const now = new Date();
      const timeMin = startOfMonth(now).toISOString();
      const timeMax = endOfMonth(addMonths(now, 2)).toISOString();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=list-events&timeMin=${timeMin}&timeMax=${timeMax}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await res.json();
      
      if (data.items) {
        setEvents(data.items);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const connectGoogle = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const redirectUri = `${window.location.origin}/calendar-callback`;
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=auth-url&redirect_uri=${encodeURIComponent(redirectUri)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await res.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghubungkan ke Google Calendar',
        variant: 'destructive',
      });
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=disconnect`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setIsConnected(false);
      setEvents([]);
      toast({
        title: 'Berhasil',
        description: 'Google Calendar berhasil diputuskan',
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const createEvent = async () => {
    if (!newEvent.summary || !newEvent.date) {
      toast({
        title: 'Error',
        description: 'Judul dan tanggal wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const startDateTime = new Date(`${newEvent.date}T${newEvent.time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour

      const eventData = {
        summary: childName ? `[${childName}] ${newEvent.summary}` : newEvent.summary,
        description: newEvent.description,
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
          title: 'Berhasil',
          description: 'Event berhasil ditambahkan ke Google Calendar',
        });
        setNewEvent({ summary: '', description: '', date: '', time: '09:00' });
        setIsAddingEvent(false);
        loadEvents();
      } else {
        throw new Error(data.error?.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Gagal membuat event',
        variant: 'destructive',
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=delete-event`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ eventId }),
        }
      );

      toast({
        title: 'Berhasil',
        description: 'Event berhasil dihapus',
      });
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const formatEventDate = (event: CalendarEvent) => {
    const dateStr = event.start.dateTime || event.start.date;
    if (!dateStr) return '';
    
    try {
      const date = parseISO(dateStr);
      if (event.start.dateTime) {
        return format(date, "d MMMM yyyy, HH:mm", { locale: id });
      }
      return format(date, "d MMMM yyyy", { locale: id });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Memuat...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          Google Calendar
        </CardTitle>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                Terhubung
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadEvents}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnectGoogle}
                title="Putuskan koneksi"
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={connectGoogle} size="sm" className="gap-2">
              <Link2 className="h-4 w-4" />
              Hubungkan
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Hubungkan Google Calendar untuk menyinkronkan jadwal imunisasi dan kegiatan anak
            </p>
            <Button onClick={connectGoogle} className="gap-2">
              <Link2 className="h-4 w-4" />
              Hubungkan Google Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-foreground">Jadwal Mendatang</h4>
              <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tambah Event Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="summary">Judul Event</Label>
                      <Input
                        id="summary"
                        value={newEvent.summary}
                        onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
                        placeholder="Contoh: Imunisasi DPT"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Tanggal</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newEvent.date}
                          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Waktu</Label>
                        <Input
                          id="time"
                          type="time"
                          value={newEvent.time}
                          onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Deskripsi (opsional)</Label>
                      <Textarea
                        id="description"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Tambahkan catatan..."
                      />
                    </div>
                    <Button onClick={createEvent} className="w-full">
                      Simpan ke Calendar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Belum ada jadwal mendatang
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {event.summary}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatEventDate(event)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEvent(event.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
