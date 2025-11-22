import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Moon, Utensils, Droplets, Monitor, Smile, Meh, Frown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface Activity {
  id: string;
  activity_type: string;
  value: number;
  unit: string;
  mood_rating: number | null;
  notes: string;
  activity_date: string;
}

interface DailyActivityLogProps {
  childId: string;
}

const activityIcons: Record<string, any> = {
  sleep: Moon,
  feeding: Utensils,
  water: Droplets,
  screen_time: Monitor,
  mood: Smile,
};

const activityLabels: Record<string, string> = {
  sleep: 'Tidur',
  feeding: 'Makan',
  water: 'Minum Air',
  screen_time: 'Waktu Layar',
  mood: 'Suasana Hati',
};

const moodIcons = [
  { value: 1, icon: Frown, color: 'text-red-500' },
  { value: 2, icon: Frown, color: 'text-orange-500' },
  { value: 3, icon: Meh, color: 'text-yellow-500' },
  { value: 4, icon: Smile, color: 'text-green-500' },
  { value: 5, icon: Smile, color: 'text-emerald-500' },
];

export const DailyActivityLog = ({ childId }: DailyActivityLogProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activityType, setActivityType] = useState('sleep');
  const [value, setValue] = useState('');
  const [moodRating, setMoodRating] = useState<number>(3);
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, [childId, selectedDate]);

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('child_id', childId)
      .eq('activity_date', selectedDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  };

  const getUnit = (type: string) => {
    switch (type) {
      case 'sleep': return 'jam';
      case 'feeding': return 'porsi';
      case 'water': return 'gelas';
      case 'screen_time': return 'menit';
      default: return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const activityData: any = {
      child_id: childId,
      activity_type: activityType,
      activity_date: selectedDate,
      notes,
    };

    if (activityType === 'mood') {
      activityData.mood_rating = moodRating;
    } else {
      activityData.value = parseFloat(value);
      activityData.unit = getUnit(activityType);
    }

    const { error } = await supabase.from('daily_activities').insert(activityData);

    if (error) {
      toast({
        title: 'Kesalahan',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Berhasil!',
        description: 'Aktivitas berhasil ditambahkan',
      });
      setValue('');
      setMoodRating(3);
      setNotes('');
      setDialogOpen(false);
      fetchActivities();
    }
  };

  const getSummary = () => {
    const summary: Record<string, number> = {};
    activities.forEach(activity => {
      if (activity.activity_type !== 'mood') {
        summary[activity.activity_type] = (summary[activity.activity_type] || 0) + activity.value;
      }
    });
    return summary;
  };

  const summary = getSummary();
  const avgMood = activities
    .filter(a => a.activity_type === 'mood' && a.mood_rating)
    .reduce((acc, a) => acc + (a.mood_rating || 0), 0) / 
    activities.filter(a => a.activity_type === 'mood').length || 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Log Aktivitas Harian</CardTitle>
          <div className="flex gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-40"
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Aktivitas</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Jenis Aktivitas</Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(activityLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {activityType === 'mood' ? (
                    <div className="space-y-2">
                      <Label>Rating Suasana Hati</Label>
                      <div className="flex gap-2 justify-center">
                        {moodIcons.map(({ value, icon: Icon, color }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setMoodRating(value)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              moodRating === value
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Icon className={`w-6 h-6 ${color}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Jumlah ({getUnit(activityType)})</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        required
                        placeholder={`Masukkan jumlah dalam ${getUnit(activityType)}`}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Catatan (Opsional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tambahkan catatan..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Tambah Aktivitas
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(activityLabels).map(([type, label]) => {
            const Icon = activityIcons[type];
            const summaryValue = type === 'mood' 
              ? avgMood > 0 ? avgMood.toFixed(1) : '-'
              : summary[type]?.toFixed(1) || '0';
            
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className="text-xl font-bold">
                  {summaryValue}
                  {type !== 'mood' && <span className="text-sm ml-1">{getUnit(type)}</span>}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Activity List */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Belum ada aktivitas untuk tanggal ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.activity_type];
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activityLabels[activity.activity_type]}</p>
                    {activity.activity_type === 'mood' && activity.mood_rating ? (
                      <div className="flex items-center gap-1">
                        {moodIcons.find(m => m.value === activity.mood_rating)?.icon && (
                          <span className={moodIcons.find(m => m.value === activity.mood_rating)!.color}>
                            ⭐ {activity.mood_rating}/5
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {activity.value} {activity.unit}
                      </p>
                    )}
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{activity.notes}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
