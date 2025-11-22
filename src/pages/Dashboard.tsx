import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { LogOut, Baby } from 'lucide-react';
import { ChildSelector } from '@/components/ChildSelector';
import { GrowthChart } from '@/components/GrowthChart';
import { MilestoneTracker } from '@/components/MilestoneTracker';
import { AIAssistant } from '@/components/AIAssistant';
import { AddMeasurementDialog } from '@/components/AddMeasurementDialog';
import { DailyActivityLog } from '@/components/DailyActivityLog';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate('/auth');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (selectedChild) {
      fetchLatestMeasurement();
    }
  }, [selectedChild, refreshKey]);

  const fetchLatestMeasurement = async () => {
    if (!selectedChild) return;

    const { data, error } = await supabase
      .from('growth_measurements')
      .select('*')
      .eq('child_id', selectedChild.id)
      .order('measurement_date', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setLatestMeasurement(data);
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                   (today.getMonth() - birthDate.getMonth());
    return months;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleChildSelect = (childId: string, child: Child) => {
    setSelectedChild(child);
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="gradient-playful shadow-soft"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-full shadow-soft">
                <Baby className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-white">KidGrowth+</h1>
            </div>
            <div className="flex items-center gap-4">
              <ChildSelector
                selectedChildId={selectedChild?.id || null}
                onChildSelect={handleChildSelect}
              />
              <Button onClick={handleSignOut} variant="outline" size="icon" className="bg-white">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {selectedChild ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Child Info & Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Dashboard {selectedChild.name}</h2>
                <p className="text-muted-foreground">
                  {calculateAge(selectedChild.date_of_birth)} bulan
                </p>
              </div>
              <AddMeasurementDialog
                childId={selectedChild.id}
                onMeasurementAdded={() => setRefreshKey(k => k + 1)}
              />
            </div>

            {/* AI Assistant */}
            {latestMeasurement && (
              <AIAssistant
                childData={{
                  name: selectedChild.name,
                  ageMonths: calculateAge(selectedChild.date_of_birth),
                  gender: selectedChild.gender,
                  latestMeasurement: {
                    height: latestMeasurement.height_cm,
                    weight: latestMeasurement.weight_kg,
                    bmi: latestMeasurement.bmi,
                  },
                }}
              />
            )}

            {/* Growth Chart */}
            <GrowthChart childId={selectedChild.id} key={`growth-${refreshKey}`} />

            {/* Milestones */}
            <MilestoneTracker childId={selectedChild.id} />

            {/* Daily Activity Log */}
            <DailyActivityLog childId={selectedChild.id} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Baby className="w-20 h-20 mx-auto mb-6 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Belum ada anak dipilih</h2>
            <p className="text-muted-foreground">
              Silakan tambahkan atau pilih anak untuk mulai melacak pertumbuhan mereka
            </p>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;