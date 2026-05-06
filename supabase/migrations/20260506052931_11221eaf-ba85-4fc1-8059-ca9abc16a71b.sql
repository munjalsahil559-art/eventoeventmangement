-- Splits
CREATE TABLE public.payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  organizer_user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  section_id UUID,
  seat_ids TEXT[] NOT NULL DEFAULT '{}',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  fee_per_seat NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | cancelled
  booking_id UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read splits (token-gated in app)"
  ON public.payment_splits FOR SELECT USING (true);

CREATE POLICY "Organizer can create their splits"
  ON public.payment_splits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = organizer_user_id);

CREATE POLICY "Organizer can update their splits"
  ON public.payment_splits FOR UPDATE TO authenticated
  USING (auth.uid() = organizer_user_id);

CREATE TRIGGER update_payment_splits_updated_at
  BEFORE UPDATE ON public.payment_splits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shares
CREATE TABLE public.payment_split_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES public.payment_splits(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  seat_label TEXT NOT NULL,
  assignee_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  payment_method TEXT,
  transaction_ref TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_split_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shares (token-gated in app)"
  ON public.payment_split_shares FOR SELECT USING (true);

CREATE POLICY "Organizer can create shares for their splits"
  ON public.payment_split_shares FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.payment_splits s
    WHERE s.id = split_id AND s.organizer_user_id = auth.uid()
  ));

CREATE INDEX idx_split_shares_split_id ON public.payment_split_shares(split_id);

-- Pay a share via token (no auth required)
CREATE OR REPLACE FUNCTION public.pay_split_share(
  _token TEXT,
  _share_id UUID,
  _payment_method TEXT,
  _transaction_ref TEXT
)
RETURNS public.payment_split_shares
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _split public.payment_splits;
  _share public.payment_split_shares;
BEGIN
  SELECT * INTO _split FROM public.payment_splits WHERE share_token = _token;
  IF _split.id IS NULL THEN RAISE EXCEPTION 'Invalid share link'; END IF;
  IF _split.status <> 'pending' THEN RAISE EXCEPTION 'Split is no longer active'; END IF;
  IF _split.expires_at < now() THEN RAISE EXCEPTION 'Share link expired'; END IF;

  UPDATE public.payment_split_shares
    SET status = 'paid',
        payment_method = _payment_method,
        transaction_ref = _transaction_ref,
        paid_at = now()
    WHERE id = _share_id AND split_id = _split.id AND status = 'pending'
    RETURNING * INTO _share;

  IF _share.id IS NULL THEN RAISE EXCEPTION 'Share already paid or not found'; END IF;
  RETURN _share;
END;
$$;

-- Finalize: when all shares paid, create booking + payments + tickets
CREATE OR REPLACE FUNCTION public.finalize_split_booking(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _split public.payment_splits;
  _pending INT;
  _booking_id UUID;
  _share RECORD;
  _section_avail INT;
BEGIN
  SELECT * INTO _split FROM public.payment_splits WHERE share_token = _token;
  IF _split.id IS NULL THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF _split.status = 'completed' THEN RETURN _split.booking_id; END IF;

  SELECT count(*) INTO _pending FROM public.payment_split_shares
    WHERE split_id = _split.id AND status <> 'paid';
  IF _pending > 0 THEN RAISE EXCEPTION 'Shares still pending: %', _pending; END IF;

  INSERT INTO public.bookings (user_id, event_id, tickets, total_amount, section_id, booked_seat_ids, payment_status, status)
  VALUES (_split.organizer_user_id, _split.event_id, array_length(_split.seat_ids,1), _split.total_amount,
          _split.section_id, _split.seat_ids, 'completed', 'confirmed')
  RETURNING id INTO _booking_id;

  IF _split.section_id IS NOT NULL THEN
    SELECT available_seats INTO _section_avail FROM public.venue_sections WHERE id = _split.section_id;
    UPDATE public.venue_sections
      SET available_seats = GREATEST(0, _section_avail - array_length(_split.seat_ids,1))
      WHERE id = _split.section_id;
  END IF;

  -- One payment + ticket row per share
  FOR _share IN SELECT * FROM public.payment_split_shares WHERE split_id = _split.id LOOP
    INSERT INTO public.payments (booking_id, user_id, amount, payment_method, transaction_ref, status)
    VALUES (_booking_id, _split.organizer_user_id, _share.amount,
            COALESCE(_share.payment_method,'split'), _share.transaction_ref, 'completed');

    INSERT INTO public.tickets (booking_id, event_id, user_id, section_id, seat_label)
    VALUES (_booking_id, _split.event_id, _split.organizer_user_id, _split.section_id, _share.seat_label);
  END LOOP;

  UPDATE public.payment_splits
    SET status = 'completed', booking_id = _booking_id
    WHERE id = _split.id;

  RETURN _booking_id;
END;
$$;