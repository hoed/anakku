import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const DiseaseDetection = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCamera, setIsCamera] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCamera(true);
      }
    } catch (error) {
      toast.error('Tidak dapat mengakses kamera');
      console.error(error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setImagePreview(imageData);
        stopCamera();
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!imagePreview) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-disease', {
        body: { imageBase64: imagePreview }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      toast.success('Analisis selesai');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Gagal menganalisis gambar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Deteksi Penyakit dengan AI
        </CardTitle>
        <CardDescription>
          Ambil foto atau unggah gambar untuk analisis kondisi kesehatan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Ini bukan pengganti diagnosis medis profesional. Selalu konsultasikan dengan dokter untuk kondisi kesehatan yang serius.
          </AlertDescription>
        </Alert>

        {!imagePreview && !isCamera && (
          <div className="flex gap-2">
            <Button onClick={startCamera} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Buka Kamera
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Unggah Foto
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {isCamera && (
          <div className="space-y-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
            />
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1">
                Ambil Foto
              </Button>
              <Button onClick={stopCamera} variant="outline">
                Batal
              </Button>
            </div>
          </div>
        )}

        {imagePreview && (
          <div className="space-y-4">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-full rounded-lg"
            />
            <div className="flex gap-2">
              <Button 
                onClick={analyzeImage} 
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Analisis Gambar
              </Button>
              <Button 
                onClick={() => {
                  setImagePreview(null);
                  setAnalysis(null);
                }} 
                variant="outline"
              >
                Hapus
              </Button>
            </div>
          </div>
        )}

        {analysis && (
          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-lg">Hasil Analisis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {analysis}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};