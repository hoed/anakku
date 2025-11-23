-- Create immunization_reminders table
CREATE TABLE public.immunization_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.immunization_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view reminders for their children" 
ON public.immunization_reminders 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM children 
  WHERE children.id = immunization_reminders.child_id 
  AND children.user_id = auth.uid()
));

CREATE POLICY "Users can insert reminders for their children" 
ON public.immunization_reminders 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM children 
  WHERE children.id = immunization_reminders.child_id 
  AND children.user_id = auth.uid()
));

CREATE POLICY "Users can update reminders for their children" 
ON public.immunization_reminders 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM children 
  WHERE children.id = immunization_reminders.child_id 
  AND children.user_id = auth.uid()
));

CREATE POLICY "Users can delete reminders for their children" 
ON public.immunization_reminders 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM children 
  WHERE children.id = immunization_reminders.child_id 
  AND children.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_immunization_reminders_updated_at
BEFORE UPDATE ON public.immunization_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();