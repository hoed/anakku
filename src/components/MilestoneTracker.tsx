import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface Milestone {
  id: string;
  title: string;
  description: string;
  category: string;
  is_achieved: boolean;
  age_range_months: string;
}

interface MilestoneTrackerProps {
  childId: string;
}

const categoryColors: Record<string, string> = {
  motor_gross: 'bg-primary text-primary-foreground',
  motor_fine: 'bg-secondary text-secondary-foreground',
  language: 'bg-accent text-accent-foreground',
  cognitive: 'bg-lavender text-lavender-foreground',
  social: 'bg-peach text-peach-foreground',
  emotional: 'bg-primary/70 text-white',
};

const categoryNames: Record<string, string> = {
  motor_gross: 'Motorik Kasar',
  motor_fine: 'Motorik Halus',
  language: 'Bahasa',
  cognitive: 'Kognitif',
  social: 'Sosial',
  emotional: 'Emosional',
};

export const MilestoneTracker = ({ childId }: MilestoneTrackerProps) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMilestones();
  }, [childId]);

  const fetchMilestones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('child_id', childId)
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
    } else {
      setMilestones(data || []);
    }
    setLoading(false);
  };

  const toggleMilestone = async (milestoneId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('milestones')
      .update({
        is_achieved: !currentStatus,
        achieved_date: !currentStatus ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', milestoneId);

    if (error) {
      toast({
        title: 'Kesalahan',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchMilestones();
      if (!currentStatus) {
        toast({
          title: '🎉 Pencapaian tercapai!',
          description: 'Perkembangan yang luar biasa!',
        });
      }
    }
  };

  const addSampleMilestones = async () => {
    const sampleMilestones = [
      { category: 'motor_gross', title: 'Duduk tanpa bantuan', age_range_months: '6-8' },
      { category: 'motor_fine', title: 'Menggenggam benda kecil', age_range_months: '6-9' },
      { category: 'language', title: 'Mengucapkan kata pertama', age_range_months: '10-14' },
      { category: 'cognitive', title: 'Memahami instruksi sederhana', age_range_months: '12-18' },
      { category: 'social', title: 'Menunjukkan kasih sayang pada orang yang dikenal', age_range_months: '6-12' },
    ];

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const milestoneData = sampleMilestones.map(m => ({
      ...m,
      child_id: childId,
      description: '',
    }));

    const { error } = await supabase.from('milestones').insert(milestoneData);

    if (error) {
      toast({
        title: 'Kesalahan',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchMilestones();
      toast({
        title: 'Contoh pencapaian berhasil ditambahkan!',
        description: 'Mulai lacak perkembangan anak Anda',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedMilestones = milestones.reduce((acc, milestone) => {
    if (!acc[milestone.category]) {
      acc[milestone.category] = [];
    }
    acc[milestone.category].push(milestone);
    return acc;
  }, {} as Record<string, Milestone[]>);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Pencapaian Perkembangan
          </CardTitle>
          {milestones.length === 0 && (
            <Button onClick={addSampleMilestones} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Contoh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {milestones.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Belum ada pencapaian. Tambahkan untuk mulai melacak!</p>
          </div>
        ) : (
          Object.entries(groupedMilestones).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <Badge className={categoryColors[category]}>
                {categoryNames[category]}
              </Badge>
              <div className="space-y-2">
                {items.map((milestone) => (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth"
                  >
                    <Checkbox
                      checked={milestone.is_achieved}
                      onCheckedChange={() => toggleMilestone(milestone.id, milestone.is_achieved)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${milestone.is_achieved ? 'line-through text-muted-foreground' : ''}`}>
                        {milestone.title}
                      </p>
                      {milestone.age_range_months && (
                        <p className="text-sm text-muted-foreground">
                          Usia umum: {milestone.age_range_months} bulan
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};