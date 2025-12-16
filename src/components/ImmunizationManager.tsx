import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Syringe, Bell, Check, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Immunization {
  id: string;
  vaccine_name: string;
  scheduled_date: string;
  notes: string | null;
  reminder_sent: boolean;
}

interface ImmunizationManagerProps {
  childId: string;
  childName: string;
}

const vaccineSchedule = [
  { name: 'Hepatitis B (0)', ageMonths: 0 },
  { name: 'BCG', ageMonths: 1 },
  { name: 'Polio 1', ageMonths: 2 },
  { name: 'DPT-HB-Hib 1', ageMonths: 2 },
  { name: 'Polio 2', ageMonths: 3 },
  { name: 'DPT-HB-Hib 2', ageMonths: 3 },
  { name: 'Polio 3', ageMonths: 4 },
  { name: 'DPT-HB-Hib 3', ageMonths: 4 },
  { name: 'Campak/MR 1', ageMonths: 9 },
  { name: 'Polio 4', ageMonths: 18 },
  { name: 'DPT-HB-Hib 4', ageMonths: 18 },
  { name: 'Campak/MR 2', ageMonths: 24 },
];

export const ImmunizationManager = ({ childId, childName }: ImmunizationManagerProps) => {
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vaccineName, setVaccineName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { syncToCalendar, checkCalendarConnection } = useGoogleCalendarSync();
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  useEffect(() => {
    fetchImmunizations();
    checkCalendarConnection().then(setIsCalendarConnected);
  }, [childId]);

  const fetchImmunizations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('immunization_reminders')
      .select('*')
      .eq('child_id', childId)
      .order('scheduled_date', { ascending: true });

    if (!error) {
      setImmunizations(data || []);
    }
    setLoading(false);
  };

  const handleAddImmunization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaccineName || !scheduledDate) {
      toast({
        title: 'Error',
        description: 'Nama vaksin dan tanggal wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    const { data, error } = await supabase
      .from('immunization_reminders')
      .insert({
        child_id: childId,
        vaccine_name: vaccineName,
        scheduled_date: scheduledDate,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Kesalahan',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Berhasil!',
        description: `Jadwal imunisasi ${vaccineName} berhasil ditambahkan`,
      });

      // Auto-sync to Google Calendar
      if (isCalendarConnected && data) {
        await syncToCalendar(
          `Imunisasi: ${vaccineName}`,
          notes || `Jadwal imunisasi ${vaccineName} untuk ${childName}`,
          scheduledDate,
          childName
        );
      }

      setVaccineName('');
      setScheduledDate('');
      setNotes('');
      setDialogOpen(false);
      fetchImmunizations();
    }
  };

  const markAsComplete = async (id: string) => {
    const { error } = await supabase
      .from('immunization_reminders')
      .update({ reminder_sent: true })
      .eq('id', id);

    if (!error) {
      toast({
        title: '✅ Imunisasi Selesai',
        description: 'Status berhasil diperbarui',
      });
      fetchImmunizations();
    }
  };

  const deleteImmunization = async (id: string) => {
    const { error } = await supabase
      .from('immunization_reminders')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({
        title: 'Dihapus',
        description: 'Jadwal imunisasi berhasil dihapus',
      });
      fetchImmunizations();
    }
  };

  const addQuickVaccine = async (vaccine: { name: string }) => {
    const today = new Date();
    const futureDate = new Date(today.setDate(today.getDate() + 7));
    const dateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('immunization_reminders')
      .insert({
        child_id: childId,
        vaccine_name: vaccine.name,
        scheduled_date: dateStr,
      })
      .select()
      .single();

    if (!error && data) {
      toast({
        title: 'Berhasil!',
        description: `${vaccine.name} ditambahkan`,
      });

      if (isCalendarConnected) {
        await syncToCalendar(
          `Imunisasi: ${vaccine.name}`,
          `Jadwal imunisasi ${vaccine.name} untuk ${childName}`,
          dateStr,
          childName
        );
      }

      fetchImmunizations();
    }
  };

  const upcomingVaccines = immunizations.filter(i => !i.reminder_sent && new Date(i.scheduled_date) >= new Date());
  const completedVaccines = immunizations.filter(i => i.reminder_sent);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-primary" />
            Jadwal Imunisasi
          </CardTitle>
          <div className="flex items-center gap-2">
            {isCalendarConnected && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                Auto-sync
              </Badge>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Tambah</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Jadwal Imunisasi</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddImmunization} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nama Vaksin</Label>
                    <Input
                      value={vaccineName}
                      onChange={(e) => setVaccineName(e.target.value)}
                      placeholder="Contoh: BCG, DPT, Polio"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pilih dari jadwal umum:</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {vaccineSchedule.map((v) => (
                        <Button
                          key={v.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setVaccineName(v.name)}
                          className={vaccineName === v.name ? 'border-primary bg-primary/10' : ''}
                        >
                          {v.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Jadwal</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan (Opsional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tambahkan catatan..."
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Simpan & Sinkronkan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        ) : immunizations.length === 0 ? (
          <div className="text-center py-8">
            <Syringe className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">Belum ada jadwal imunisasi</p>
            <div className="flex flex-wrap justify-center gap-2">
              {vaccineSchedule.slice(0, 4).map((v) => (
                <Button
                  key={v.name}
                  variant="outline"
                  size="sm"
                  onClick={() => addQuickVaccine(v)}
                >
                  + {v.name}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {upcomingVaccines.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Jadwal Mendatang
                </h4>
                {upcomingVaccines.map((imm) => (
                  <motion.div
                    key={imm.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{imm.vaccine_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(imm.scheduled_date), 'd MMMM yyyy', { locale: id })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => markAsComplete(imm.id)}
                        title="Tandai selesai"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteImmunization(imm.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {completedVaccines.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Sudah Selesai ({completedVaccines.length})
                </h4>
                <div className="space-y-1">
                  {completedVaccines.slice(0, 3).map((imm) => (
                    <div
                      key={imm.id}
                      className="flex items-center justify-between p-2 rounded bg-muted/30"
                    >
                      <span className="text-sm text-muted-foreground line-through">
                        {imm.vaccine_name}
                      </span>
                      <Badge variant="secondary" className="text-xs">Selesai</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
