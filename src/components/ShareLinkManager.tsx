import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Share2, Copy, Trash2, Link as LinkIcon, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ShareLink {
  id: string;
  share_token: string;
  access_code: string;
  expires_at: string;
  doctor_name: string | null;
  doctor_email: string | null;
  is_active: boolean;
  access_count: number;
  last_accessed_at: string | null;
}

interface ShareLinkManagerProps {
  childId: string;
}

export const ShareLinkManager = ({ childId }: ShareLinkManagerProps) => {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);

  useEffect(() => {
    fetchShareLinks();
  }, [childId]);

  const fetchShareLinks = async () => {
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShareLinks(data);
    }
  };

  const createShareLink = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-share-link', {
        body: {
          childId,
          doctorName,
          doctorEmail,
          expiresInDays
        }
      });

      if (error) throw error;

      toast.success('Link berbagi dibuat!');
      
      // Copy to clipboard
      navigator.clipboard.writeText(
        `Link: ${data.shareLink}\nKode Akses: ${data.accessCode}`
      );
      toast.info('Link dan kode disalin ke clipboard');

      setOpen(false);
      setDoctorName('');
      setDoctorEmail('');
      fetchShareLinks();
    } catch (error: any) {
      toast.error(error.message || 'Gagal membuat link');
    } finally {
      setLoading(false);
    }
  };

  const deleteShareLink = async (id: string) => {
    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq('id', id);

    if (!error) {
      toast.success('Link dihapus');
      fetchShareLinks();
    } else {
      toast.error('Gagal menghapus link');
    }
  };

  const copyShareLink = (token: string, accessCode: string) => {
    const link = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(
      `Link: ${link}\nKode Akses: ${accessCode}`
    );
    toast.success('Link dan kode disalin');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Berbagi dengan Dokter
        </CardTitle>
        <CardDescription>
          Buat link khusus untuk dokter agar dapat melihat data anak
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <LinkIcon className="w-4 h-4 mr-2" />
              Buat Link Berbagi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Link Berbagi</DialogTitle>
              <DialogDescription>
                Buat link dengan akses terbatas untuk dokter
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="doctorName">Nama Dokter (opsional)</Label>
                <Input
                  id="doctorName"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Dr. Ahmad"
                />
              </div>
              <div>
                <Label htmlFor="doctorEmail">Email Dokter (opsional)</Label>
                <Input
                  id="doctorEmail"
                  type="email"
                  value={doctorEmail}
                  onChange={(e) => setDoctorEmail(e.target.value)}
                  placeholder="dokter@example.com"
                />
              </div>
              <div>
                <Label htmlFor="expires">Berlaku Selama (hari)</Label>
                <Input
                  id="expires"
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  min="1"
                  max="365"
                />
              </div>
              <Button onClick={createShareLink} disabled={loading} className="w-full">
                {loading ? 'Membuat...' : 'Buat Link'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          {shareLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada link berbagi
            </p>
          ) : (
            shareLinks.map((link) => (
              <Card key={link.id}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {link.doctor_name || 'Dokter'}
                        </p>
                        {link.doctor_email && (
                          <p className="text-sm text-muted-foreground">
                            {link.doctor_email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Berlaku hingga: {format(new Date(link.expires_at), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Diakses: {link.access_count}x
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyShareLink(link.share_token, link.access_code)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteShareLink(link.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};