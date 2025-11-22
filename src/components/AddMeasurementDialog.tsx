import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddMeasurementDialogProps {
  childId: string;
  onMeasurementAdded: () => void;
}

export const AddMeasurementDialog = ({ childId, onMeasurementAdded }: AddMeasurementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const calculateBMI = (weightKg: number, heightCm: number) => {
    const heightM = heightCm / 100;
    return (weightKg / (heightM * heightM)).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!height || !weight) {
      toast({
        title: 'Kesalahan',
        description: 'Harap isi semua kolom',
        variant: 'destructive',
      });
      return;
    }

    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    const bmi = parseFloat(calculateBMI(weightNum, heightNum));

    setLoading(true);
    const { error } = await supabase
      .from('growth_measurements')
      .insert({
        child_id: childId,
        height_cm: heightNum,
        weight_kg: weightNum,
        bmi: bmi,
        measurement_date: date,
      });

    if (error) {
      toast({
        title: 'Kesalahan',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Berhasil!',
        description: 'Pengukuran berhasil ditambahkan',
      });
      setHeight('');
      setWeight('');
      setDate(new Date().toISOString().split('T')[0]);
      setOpen(false);
      onMeasurementAdded();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-soft">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pengukuran
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengukuran Pertumbuhan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Tanggal</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height">Tinggi Badan (cm)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="cth: 75.5"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">Berat Badan (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="cth: 9.5"
              required
            />
          </div>
          {height && weight && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                BMI: {calculateBMI(parseFloat(weight), parseFloat(height))}
              </p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Menambahkan...' : 'Tambah Pengukuran'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};