-- Create children table
CREATE TABLE public.children (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create growth_measurements table
CREATE TABLE public.growth_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  bmi DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('motor_gross', 'motor_fine', 'language', 'cognitive', 'social', 'emotional')),
  title TEXT NOT NULL,
  description TEXT,
  age_range_months TEXT,
  is_achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for children
CREATE POLICY "Users can view their own children"
  ON public.children FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own children"
  ON public.children FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own children"
  ON public.children FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own children"
  ON public.children FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for growth_measurements
CREATE POLICY "Users can view measurements for their children"
  ON public.growth_measurements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = growth_measurements.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert measurements for their children"
  ON public.growth_measurements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = growth_measurements.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update measurements for their children"
  ON public.growth_measurements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = growth_measurements.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete measurements for their children"
  ON public.growth_measurements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = growth_measurements.child_id
      AND children.user_id = auth.uid()
    )
  );

-- RLS Policies for milestones
CREATE POLICY "Users can view milestones for their children"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = milestones.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert milestones for their children"
  ON public.milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = milestones.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update milestones for their children"
  ON public.milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = milestones.child_id
      AND children.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete milestones for their children"
  ON public.milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = milestones.child_id
      AND children.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();