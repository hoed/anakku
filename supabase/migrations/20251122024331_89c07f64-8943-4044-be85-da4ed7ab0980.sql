-- Create daily_activities table for tracking sleep, feeding, water, screen time, and mood
CREATE TABLE public.daily_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('sleep', 'feeding', 'water', 'screen_time', 'mood')),
  value NUMERIC,
  unit TEXT,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view activities for their children"
ON public.daily_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM children
    WHERE children.id = daily_activities.child_id
    AND children.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert activities for their children"
ON public.daily_activities
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM children
    WHERE children.id = daily_activities.child_id
    AND children.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update activities for their children"
ON public.daily_activities
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM children
    WHERE children.id = daily_activities.child_id
    AND children.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete activities for their children"
ON public.daily_activities
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM children
    WHERE children.id = daily_activities.child_id
    AND children.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_activities_updated_at
BEFORE UPDATE ON public.daily_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_daily_activities_child_date ON public.daily_activities(child_id, activity_date DESC);