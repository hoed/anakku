import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Baby } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
}

interface ChildSelectorProps {
  selectedChildId: string | null;
  onChildSelect: (childId: string, child: Child) => void;
}

export const ChildSelector = ({ selectedChildId, onChildSelect }: ChildSelectorProps) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [newChildGender, setNewChildGender] = useState('male');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching children:', error);
      return;
    }

    setChildren(data || []);
    if (data && data.length > 0 && !selectedChildId) {
      onChildSelect(data[0].id, data[0]);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName || !newChildDob) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      toast({
        title: 'Kesalahan',
        description: 'Anda harus login terlebih dahulu',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('children')
      .insert({
        user_id: userData.user.id,
        name: newChildName,
        date_of_birth: newChildDob,
        gender: newChildGender,
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
        description: `${newChildName} berhasil ditambahkan`,
      });
      setNewChildName('');
      setNewChildDob('');
      setNewChildGender('male');
      setDialogOpen(false);
      fetchChildren();
      if (data) {
        onChildSelect(data.id, data);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedChildId || undefined}
        onValueChange={(value) => {
          const child = children.find(c => c.id === value);
          if (child) onChildSelect(value, child);
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Pilih anak" />
        </SelectTrigger>
        <SelectContent>
          {children.map((child) => (
            <SelectItem key={child.id} value={child.id}>
              {child.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-primary" />
              Tambah Anak Baru
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddChild} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                placeholder="Nama anak"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Tanggal Lahir</Label>
              <Input
                id="dob"
                type="date"
                value={newChildDob}
                onChange={(e) => setNewChildDob(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Jenis Kelamin</Label>
              <RadioGroup value={newChildGender} onValueChange={setNewChildGender}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Laki-laki</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Perempuan</Label>
                </div>
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menambahkan...' : 'Tambah Anak'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};