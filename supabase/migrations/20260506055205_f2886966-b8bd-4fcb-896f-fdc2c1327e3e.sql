CREATE POLICY "Anyone can view verified payout accounts"
ON public.admin_payment_accounts
FOR SELECT
TO authenticated, anon
USING (is_verified = true);