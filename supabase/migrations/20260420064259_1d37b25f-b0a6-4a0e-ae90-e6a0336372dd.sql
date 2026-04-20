-- Add booked seat IDs column
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booked_seat_ids text[] DEFAULT '{}'::text[];

-- Enable realtime for bookings so admins see live updates
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;