import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Plus, Image as ImageIcon, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface PhotoEntry {
  id: string;
  photo_url: string;
  caption: string | null;
  photo_date: string;
  created_at: string;
}

interface PhotoDevelopmentProps {
  childId: string;
  childName: string;
}

export const PhotoDevelopment = ({ childId, childName }: PhotoDevelopmentProps) => {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);
  const [caption, setCaption] = useState('');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPhotos();
  }, [childId]);

  const fetchPhotos = async () => {
    setLoading(true);
    // For now, we'll store photos in milestones with a special category
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('child_id', childId)
      .eq('category', 'photo_development')
      .order('achieved_date', { ascending: false });

    if (!error && data) {
      const photoData: PhotoEntry[] = data.map(item => ({
        id: item.id,
        photo_url: item.description || '',
        caption: item.title,
        photo_date: item.achieved_date || item.created_at,
        created_at: item.created_at,
      }));
      setPhotos(photoData);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Ukuran file maksimal 5MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewUrl) {
      toast({
        title: 'Error',
        description: 'Pilih foto terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    // Store as base64 in the description field (for demo purposes)
    // In production, you'd want to use Supabase Storage
    const { error } = await supabase
      .from('milestones')
      .insert({
        child_id: childId,
        category: 'photo_development',
        title: caption || `Foto ${childName}`,
        description: previewUrl,
        achieved_date: photoDate,
        is_achieved: true,
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
        description: 'Foto berhasil ditambahkan',
      });
      setCaption('');
      setPhotoDate(new Date().toISOString().split('T')[0]);
      setPreviewUrl(null);
      setDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchPhotos();
    }
    setUploading(false);
  };

  const deletePhoto = async (id: string) => {
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({
        title: 'Dihapus',
        description: 'Foto berhasil dihapus',
      });
      fetchPhotos();
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Foto Perkembangan
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah Foto</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Foto Perkembangan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label>Foto</Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg object-cover"
                      />
                    ) : (
                      <div className="py-8">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Klik untuk pilih foto
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Foto</Label>
                  <Input
                    type="date"
                    value={photoDate}
                    onChange={(e) => setPhotoDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Keterangan</Label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Contoh: Pertama kali berdiri sendiri"
                    rows={2}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={uploading || !previewUrl}>
                  {uploading ? 'Menyimpan...' : 'Simpan Foto'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">Belum ada foto perkembangan</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Foto Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <div
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer bg-muted"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Foto perkembangan'}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-end p-2">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                  <p className="text-white/70 text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(photo.photo_date), 'd MMM yyyy', { locale: id })}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePhoto(photo.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Photo Detail Dialog */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-lg">
            {selectedPhoto && (
              <>
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.caption || ''}
                  className="w-full rounded-lg"
                />
                <div className="space-y-2">
                  {selectedPhoto.caption && (
                    <p className="font-medium">{selectedPhoto.caption}</p>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedPhoto.photo_date), 'd MMMM yyyy', { locale: id })}
                  </p>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
