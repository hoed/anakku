import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GrowthChart } from '@/components/GrowthChart';
import { MilestoneTracker } from '@/components/MilestoneTracker';
import { AlertCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SharedView() {
  const { token } = useParams();
  const [accessCode, setAccessCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [childData, setChildData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyAccess = async () => {
    setLoading(true);
    setError('');

    try {
      // Verify share link
      const { data: shareLink, error: linkError } = await supabase
        .from('share_links')
        .select('*, children(*)')
        .eq('share_token', token)
        .eq('access_code', accessCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (linkError || !shareLink) {
        throw new Error('Kode akses salah atau link tidak valid');
      }

      // Check expiration
      if (new Date(shareLink.expires_at) < new Date()) {
        throw new Error('Link sudah kadaluarsa');
      }

      // Update access count
      await supabase
        .from('share_links')
        .update({
          access_count: shareLink.access_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', shareLink.id);

      setChildData(shareLink.children);
      setIsVerified(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Akses Data Anak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Masukkan kode akses yang diberikan oleh orang tua
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="accessCode">Kode Akses</Label>
              <Input
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode 6 karakter"
                maxLength={6}
              />
            </div>

            <Button 
              onClick={verifyAccess} 
              disabled={loading || accessCode.length !== 6}
              className="w-full"
            >
              {loading ? 'Memverifikasi...' : 'Akses Data'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-playful shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">
            Data Tumbuh Kembang - {childData?.name}
          </h1>
          <p className="text-white/80 text-sm">
            Akses read-only untuk tenaga medis
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Anda melihat data dalam mode read-only. Data ini dibagikan dengan tujuan medis.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Informasi Anak</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Nama</dt>
                <dd className="font-medium">{childData?.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Jenis Kelamin</dt>
                <dd className="font-medium capitalize">{childData?.gender}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Tanggal Lahir</dt>
                <dd className="font-medium">
                  {new Date(childData?.date_of_birth).toLocaleDateString('id-ID')}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <GrowthChart childId={childData?.id} />
        <MilestoneTracker childId={childData?.id} />
      </main>
    </div>
  );
}