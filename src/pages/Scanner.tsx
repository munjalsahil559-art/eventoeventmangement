import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';
import { ArrowLeft, ScanLine, CheckCircle2, XCircle, AlertTriangle, Camera, CameraOff, Ticket as TicketIcon, User, Calendar, Armchair, RefreshCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type ScanState = 'idle' | 'success' | 'used' | 'invalid' | 'wrong-event';

interface ScanResult {
  state: ScanState;
  message: string;
  ticket?: {
    code: string;
    seat: string;
    section: string;
    event: string;
    date: string;
    customer: string;
    checkedAt?: string;
  };
}

interface MyEvent {
  id: string;
  title: string;
}

const Scanner = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [cameraOn, setCameraOn] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [stats, setStats] = useState({ scanned: 0, valid: 0, rejected: 0 });
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      toast.error('Admin access required');
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('events')
      .select('id, title')
      .eq('created_by', user.id)
      .then(({ data }) => setMyEvents((data as MyEvent[]) || []));
  }, [user]);

  const handleScan = async (code: string) => {
    if (processing) return;
    // Debounce — ignore the same code within 3s
    const now = Date.now();
    if (code === lastScannedRef.current && now - lastScanTimeRef.current < 3000) return;
    lastScannedRef.current = code;
    lastScanTimeRef.current = now;

    setProcessing(true);
    setStats(s => ({ ...s, scanned: s.scanned + 1 }));

    // Lookup ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('id, ticket_code, seat_label, status, checked_in_at, event_id, user_id, events(title, date, created_by), venue_sections(section_name)')
      .eq('ticket_code', code)
      .maybeSingle();

    if (error || !ticket) {
      setResult({ state: 'invalid', message: 'Ticket not found in system' });
      setStats(s => ({ ...s, rejected: s.rejected + 1 }));
      navigator.vibrate?.(300);
      setTimeout(() => { setResult(null); setProcessing(false); }, 2500);
      return;
    }

    const t = ticket as any;
    // Check organizer ownership (admins can only scan their own events)
    if (t.events?.created_by !== user!.id) {
      setResult({ state: 'wrong-event', message: 'This ticket belongs to a different organizer\'s event' });
      setStats(s => ({ ...s, rejected: s.rejected + 1 }));
      navigator.vibrate?.(300);
      setTimeout(() => { setResult(null); setProcessing(false); }, 2500);
      return;
    }

    // Filter check
    if (eventFilter !== 'all' && t.event_id !== eventFilter) {
      setResult({
        state: 'wrong-event',
        message: 'Wrong event — ticket is for a different show',
        ticket: { code: t.ticket_code, seat: t.seat_label, section: t.venue_sections?.section_name || 'GA', event: t.events?.title, date: t.events?.date, customer: '' },
      });
      setStats(s => ({ ...s, rejected: s.rejected + 1 }));
      navigator.vibrate?.(300);
      setTimeout(() => { setResult(null); setProcessing(false); }, 2500);
      return;
    }

    // Get customer name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', t.user_id)
      .maybeSingle();
    const customer = profile?.display_name || 'Guest';

    // Already used?
    if (t.status === 'used') {
      setResult({
        state: 'used',
        message: 'Ticket already checked in',
        ticket: {
          code: t.ticket_code,
          seat: t.seat_label,
          section: t.venue_sections?.section_name || 'GA',
          event: t.events?.title,
          date: t.events?.date,
          customer,
          checkedAt: t.checked_in_at,
        },
      });
      setStats(s => ({ ...s, rejected: s.rejected + 1 }));
      navigator.vibrate?.([100, 80, 100]);
      setTimeout(() => { setResult(null); setProcessing(false); }, 3000);
      return;
    }

    if (t.status === 'cancelled') {
      setResult({ state: 'invalid', message: 'Ticket has been cancelled / voided' });
      setStats(s => ({ ...s, rejected: s.rejected + 1 }));
      navigator.vibrate?.(300);
      setTimeout(() => { setResult(null); setProcessing(false); }, 2500);
      return;
    }

    // Valid — mark as used
    const { error: updErr } = await supabase
      .from('tickets')
      .update({ status: 'used', checked_in_at: new Date().toISOString(), checked_in_by: user!.id })
      .eq('id', t.id);

    if (updErr) {
      setResult({ state: 'invalid', message: 'Could not check in ticket — try again' });
      navigator.vibrate?.(300);
      setTimeout(() => { setResult(null); setProcessing(false); }, 2500);
      return;
    }

    setResult({
      state: 'success',
      message: 'Welcome — entry granted!',
      ticket: {
        code: t.ticket_code,
        seat: t.seat_label,
        section: t.venue_sections?.section_name || 'GA',
        event: t.events?.title,
        date: t.events?.date,
        customer,
      },
    });
    setStats(s => ({ ...s, valid: s.valid + 1 }));
    navigator.vibrate?.(120);
    setTimeout(() => { setResult(null); setProcessing(false); }, 2500);
  };

  if (authLoading || !user || !isAdmin) return null;

  const stateConfig = {
    success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/40', title: 'ENTRY GRANTED' },
    used: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/40', title: 'ALREADY USED' },
    invalid: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/40', title: 'INVALID TICKET' },
    'wrong-event': { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/40', title: 'WRONG EVENT' },
    idle: null,
  };

  return (
    <div className="container mx-auto max-w-2xl py-6">
      <button onClick={() => navigate('/admin')} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </button>

      <div className="mb-5">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <ScanLine className="h-7 w-7 text-primary" /> Ticket Scanner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Point the camera at attendee QR codes to validate entry</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl border border-border bg-card px-3 py-2 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Scanned</p>
          <p className="font-display text-xl font-bold">{stats.scanned}</p>
        </div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-3 py-2 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Allowed In</p>
          <p className="font-display text-xl font-bold text-green-500">{stats.valid}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Rejected</p>
          <p className="font-display text-xl font-bold text-destructive">{stats.rejected}</p>
        </div>
      </div>

      {/* Event filter */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground mb-1.5 block">Validate tickets for</label>
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">All my events</option>
          {myEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </select>
      </div>

      {/* Scanner viewport */}
      <div className="relative rounded-2xl border-2 border-border bg-black overflow-hidden aspect-square mb-4">
        {cameraOn ? (
          <>
            <QrScanner
              onScan={(detected) => {
                const text = detected?.[0]?.rawValue;
                if (text) handleScan(text);
              }}
              onError={(err) => console.warn('Scanner error', err)}
              constraints={{ facingMode: 'environment' }}
              styles={{ container: { width: '100%', height: '100%' }, video: { width: '100%', height: '100%', objectFit: 'cover' } }}
            />
            {/* Scan target overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative h-3/5 w-3/5">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <CameraOff className="h-16 w-16 mb-2" />
            <p className="text-sm">Camera is off</p>
          </div>
        )}

        {/* Result overlay */}
        <AnimatePresence>
          {result && stateConfig[result.state] && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-6 ${stateConfig[result.state]!.bg}`}
            >
              {(() => {
                const cfg = stateConfig[result.state]!;
                const Icon = cfg.icon;
                return (
                  <>
                    <Icon className={`h-20 w-20 ${cfg.color} mb-3`} />
                    <p className={`font-display text-2xl font-bold ${cfg.color} mb-1`}>{cfg.title}</p>
                    <p className="text-sm text-center text-foreground/80 mb-3">{result.message}</p>
                    {result.ticket && (
                      <div className="rounded-xl border border-border bg-card/90 backdrop-blur p-3 w-full max-w-xs text-xs space-y-1.5">
                        <div className="flex items-center gap-2"><TicketIcon className="h-3.5 w-3.5 text-primary" /><span className="font-semibold">{result.ticket.event}</span></div>
                        {result.ticket.customer && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" /><span>{result.ticket.customer}</span></div>}
                        <div className="flex items-center gap-2"><Armchair className="h-3.5 w-3.5 text-muted-foreground" /><span>{result.ticket.section} · Seat {result.ticket.seat}</span></div>
                        <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /><span>{new Date(result.ticket.date).toLocaleDateString('en-IN')}</span></div>
                        {result.ticket.checkedAt && (
                          <div className="text-amber-500 pt-1 border-t border-border">
                            Already entered at {new Date(result.ticket.checkedAt).toLocaleTimeString('en-IN')}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setCameraOn(c => !c)}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm hover:bg-secondary transition-colors"
        >
          {cameraOn ? <><CameraOff className="h-4 w-4" /> Pause Camera</> : <><Camera className="h-4 w-4" /> Resume Camera</>}
        </button>
        <button
          onClick={() => { setStats({ scanned: 0, valid: 0, rejected: 0 }); toast.info('Stats reset'); }}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-4 text-[11px] text-center text-muted-foreground">
        On phones the rear camera is used. Allow camera permission in your browser if prompted.
      </p>
    </div>
  );
};

export default Scanner;
