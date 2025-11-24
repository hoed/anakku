-- Create share_links table for doctor access
CREATE TABLE public.share_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id uuid NOT NULL,
  share_token text NOT NULL UNIQUE,
  access_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_by uuid NOT NULL,
  doctor_name text,
  doctor_email text,
  is_active boolean NOT NULL DEFAULT true,
  access_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT share_links_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE,
  CONSTRAINT share_links_expires_at_check CHECK (expires_at > created_at)
);

-- Enable RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view share links for their children"
ON public.share_links
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM children
  WHERE children.id = share_links.child_id
  AND children.user_id = auth.uid()
));

CREATE POLICY "Users can create share links for their children"
ON public.share_links
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM children
  WHERE children.id = share_links.child_id
  AND children.user_id = auth.uid()
) AND created_by = auth.uid());

CREATE POLICY "Users can update share links for their children"
ON public.share_links
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM children
  WHERE children.id = share_links.child_id
  AND children.user_id = auth.uid()
));

CREATE POLICY "Users can delete share links for their children"
ON public.share_links
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM children
  WHERE children.id = share_links.child_id
  AND children.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_share_links_updated_at
BEFORE UPDATE ON public.share_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();