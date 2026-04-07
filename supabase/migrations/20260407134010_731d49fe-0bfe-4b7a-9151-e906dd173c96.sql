
-- Venue sections for seat selection
CREATE TABLE public.venue_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  total_seats INTEGER NOT NULL DEFAULT 100,
  available_seats INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue sections are viewable by everyone"
  ON public.venue_sections FOR SELECT USING (true);

CREATE POLICY "Admins can insert venue sections"
  ON public.venue_sections FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update venue sections"
  ON public.venue_sections FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete venue sections"
  ON public.venue_sections FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add section_id to bookings
ALTER TABLE public.bookings ADD COLUMN section_id UUID REFERENCES public.venue_sections(id);

-- Auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  -- Auto-assign role based on signup metadata (default: user)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'user')::app_role);
  
  RETURN NEW;
END;
$$;
