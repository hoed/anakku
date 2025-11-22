import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Ruler, Weight, TrendingUp } from 'lucide-react';

interface GrowthData {
  measurement_date: string;
  height_cm: number;
  weight_kg: number;
  bmi: number;
}

interface GrowthChartProps {
  childId: string;
}

export const GrowthChart = ({ childId }: GrowthChartProps) => {
  const [measurements, setMeasurements] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeasurements();
  }, [childId]);

  const fetchMeasurements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('growth_measurements')
      .select('*')
      .eq('child_id', childId)
      .order('measurement_date', { ascending: true });

    if (error) {
      console.error('Error fetching measurements:', error);
    } else {
      setMeasurements(data || []);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const chartData = measurements.map(m => ({
    date: formatDate(m.measurement_date),
    height: m.height_cm,
    weight: m.weight_kg,
    bmi: m.bmi,
  }));

  const latestMeasurement = measurements[measurements.length - 1];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {latestMeasurement && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Ruler className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Tinggi</span>
              </div>
              <p className="text-2xl font-bold">{latestMeasurement.height_cm} cm</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <Weight className="w-4 h-4 text-secondary-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Berat</span>
              </div>
              <p className="text-2xl font-bold">{latestMeasurement.weight_kg} kg</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">BMI</span>
              </div>
              <p className="text-2xl font-bold">{latestMeasurement.bmi}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Tren Pertumbuhan</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Belum ada pengukuran. Tambahkan pengukuran pertama untuk melihat grafik!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="height"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Tinggi (cm)"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  name="Berat (kg)"
                  dot={{ fill: 'hsl(var(--secondary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};