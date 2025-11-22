import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantProps {
  childData: {
    name: string;
    ageMonths: number;
    gender: string;
    latestMeasurement?: {
      height: number;
      weight: number;
      bmi: number;
    };
  };
}

export const AIAssistant = ({ childData }: AIAssistantProps) => {
  const [advice, setAdvice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getGrowthAnalysis = async () => {
    if (!childData.latestMeasurement) {
      toast({
        title: 'Data tidak tersedia',
        description: 'Harap tambahkan pengukuran pertumbuhan terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('growth-assistant', {
        body: {
          type: 'growth_analysis',
          data: {
            name: childData.name,
            ageMonths: childData.ageMonths,
            gender: childData.gender,
            height: childData.latestMeasurement.height,
            weight: childData.latestMeasurement.weight,
            bmi: childData.latestMeasurement.bmi,
          },
        },
      });

      if (error) throw error;

      setAdvice(data.advice);
    } catch (error: any) {
      toast({
        title: 'Kesalahan',
        description: error.message || 'Gagal mendapatkan analisis AI',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card gradient-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <div className="p-2 bg-white/20 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          Asisten Pertumbuhan AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={getGrowthAnalysis}
          disabled={loading}
          className="w-full bg-white hover:bg-white/90 text-foreground"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Dapatkan Analisis Pertumbuhan AI
            </>
          )}
        </Button>

        <AnimatePresence>
          {advice && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 bg-white rounded-lg shadow-soft"
            >
              <p className="text-sm text-foreground whitespace-pre-wrap">{advice}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};