import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, Users, CreditCard, Smartphone, Loader2, XCircle, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Split {
  id: string;
  share_token: string;
  event_id: string;
  total_amount: number;
  status: string;
  expires_at: string;
  booking_id: string | null;
  organizer_user_id: string;
}
interface Share {
  id: string;
  seat_id: string;
  seat_label: string;
  assignee_name: string;
  amount: number;
  status: string;
  payment_method: string | null;
}
interface Ev { title: string; date: string; venue: string | null; city: string; image_url: string | null; }

const SplitPay = () => {
  const { token } = useParams();
  const { user } = useAuth();
  const [split, setSplit] = useState<Split | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [event, setEvent] = useState<Ev | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [methodFor, setMethodFor] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    if (!token) return;
    const { data: s } = await supabase.from('payment_splits').select('*').eq('share_token', token).maybeSingle();
    if (!s) { setLoading(false); return; }
    setSplit(s as Split);
    const { data: sh } = await supabase.from('payment_split_shares').select('*').eq('split_id', s.id).order('seat_label');
    setShares((sh || []) as Share[]);
    const { data: ev } = await supabase.from('events').select('title, date, venue, city, image_url').eq('id', s.event_id).maybeSingle();
    if (ev) setEvent(ev as Ev);
    setLoading(false);
  };

  useEffect(() => { load(); }, [token]);

  useEffect(() => {
    if (!split) return;
    const ch = supabase.channel(`split-${split.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_split_shares', filter: `split_id=eq.${split.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_splits', filter: `id=eq.${split.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split?.id]);

  const pay = async (shareId: string, method: 'card' | 'upi') => {
    if (!token) return;
    setPaying(shareId);
    const txnRef = `SPL-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.rpc('pay_split_share', {
      _token: token, _share_id: shareId, _payment_method: method, _transaction_ref: txnRef,
    });
    if (error) { toast.error(error.message); setPaying(null); return; }
    toast.success('Payment successful!');
    setMethodFor(null);

    // Try to finalize (will only succeed when all shares paid)
    const { data: bookingId, error: finErr } = await supabase.rpc('finalize_split_booking', { _token: token });
    if (!finErr && bookingId) toast.success('All friends paid — booking confirmed!');
    setPaying(null);
    load();
  };

  const cancelSplit = async () => {
    if (!split) return;
    if (!confirm('Cancel this split? Friends who already paid will need a manual refund.')) return;
    setCancelling(true);
    const { error } = await supabase
      .from('payment_splits')
      .update({ status: 'cancelled' })
      .eq('id', split.id);
    setCancelling(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Split cancelled');
    load();
  };

  if (loading) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!split) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Invalid or expired split link.</p></div>;

  const paid = shares.filter(s => s.status === 'paid').length;
  const expired = new Date(split.expires_at) < new Date();
  const completed = split.status === 'completed';
  const cancelled = split.status === 'cancelled';
  const isOrganizer = user?.id === split.organizer_user_id;
  const locked = completed || expired || cancelled;

  return (
    <div className="container mx-auto max-w-2xl py-6">
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex gap-4">
          {event?.image_url && <img src={event.image_url} alt={event.title} className="h-20 w-32 rounded-lg object-cover" />}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Users className="h-3.5 w-3.5" /> Group Booking
            </div>
            <h1 className="mt-1 font-display text-xl font-semibold">{event?.title || 'Event'}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {event && new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              {event?.venue && ` · ${event.venue}, ${event.city}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Progress</span>
          <span className="text-muted-foreground">{paid} of {shares.length} paid</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full gradient-primary transition-all" style={{ width: `${(paid / shares.length) * 100}%` }} />
        </div>
        {!completed && !expired && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> Expires {new Date(split.expires_at).toLocaleString('en-IN')}
          </p>
        )}
        {completed && (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-green-500">
            <CheckCircle2 className="h-4 w-4" /> Booking confirmed for all friends!
          </p>
        )}
        {expired && !completed && (
          <p className="mt-2 text-xs font-semibold text-destructive">This split link has expired.</p>
        )}
        {cancelled && (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-destructive">
            <XCircle className="h-4 w-4" /> The organizer cancelled this split. No further payments can be made.
          </p>
        )}
        {isOrganizer && !locked && (
          <button
            onClick={cancelSplit}
            disabled={cancelling}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Ban className="h-3.5 w-3.5" /> {cancelling ? 'Cancelling…' : 'Cancel split'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {shares.map(share => (
          <div key={share.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-secondary px-2.5 py-1.5 font-mono text-xs font-semibold">Seat {share.seat_label}</span>
                <div>
                  <p className="text-sm font-semibold">{share.assignee_name}</p>
                  <p className="text-xs text-muted-foreground">₹{Number(share.amount).toLocaleString()}</p>
                </div>
              </div>
              {share.status === 'paid' ? (
                <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                </span>
              ) : locked ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : methodFor === share.id ? (
                <div className="flex gap-2">
                  <button onClick={() => pay(share.id, 'card')} disabled={paying === share.id}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                    <CreditCard className="h-3.5 w-3.5" /> Card
                  </button>
                  <button onClick={() => pay(share.id, 'upi')} disabled={paying === share.id}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                    <Smartphone className="h-3.5 w-3.5" /> UPI
                  </button>
                  <button onClick={() => setMethodFor(null)} className="rounded-lg border border-border px-2 py-1.5 text-xs">×</button>
                </div>
              ) : (
                <button onClick={() => setMethodFor(share.id)}
                  className="gradient-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  Pay my share
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {completed && (
        <Link to="/profile" className="mt-6 block w-full gradient-primary rounded-lg py-3 text-center text-sm font-semibold text-primary-foreground">
          View booking
        </Link>
      )}
    </div>
  );
};

export default SplitPay;