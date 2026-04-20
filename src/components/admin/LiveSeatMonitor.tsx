import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Armchair, Users, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VenueSeatMap from '@/components/booking/VenueSeatMap';

interface VenueSection {
  id: string;
  event_id: string;
  section_name: string;
  price: number;
  total_seats: number;
  available_seats: number;
}

interface LiveSeatMonitorProps {
  eventId: string;
  eventTitle: string;
}

const LiveSeatMonitor = ({ eventId, eventTitle }: LiveSeatMonitorProps) => {
  const [sections, setSections] = useState<VenueSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<VenueSection | null>(null);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingCount, setBookingCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const refresh = async () => {
    const { data: secs } = await supabase.from('venue_sections').select('*').eq('event_id', eventId);
    const { data: bks } = await supabase.from('bookings').select('booked_seat_ids').eq('event_id', eventId);
    const list = (secs || []) as VenueSection[];
    setSections(list);
    if (list.length && !selectedSection) setSelectedSection(list[0]);
    const all = (bks || []).flatMap(b => (b.booked_seat_ids as string[] | null) || []);
    setBookedSeats(all);
    setBookingCount(bks?.length || 0);
    setLoading(false);
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const { data: bks } = await supabase
        .from('bookings')
        .select('id, user_id, tickets, total_amount, status, payment_status, booked_seat_ids, section_id, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (!bks || bks.length === 0) {
        toast.info('No bookings to export yet.');
        setExporting(false);
        return;
      }

      const userIds = Array.from(new Set(bks.map(b => b.user_id)));
      const bookingIds = bks.map(b => b.id);

      const [{ data: profiles }, { data: pays }] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, phone, city').in('user_id', userIds),
        supabase.from('payments').select('booking_id, transaction_ref, payment_method, card_last_four, upi_id, amount').in('booking_id', bookingIds),
      ]);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const payMap = new Map((pays || []).map(p => [p.booking_id, p]));
      const sectionMap = new Map(sections.map(s => [s.id, s]));

      const headers = [
        'Ticket #', 'Booking ID', 'Transaction Ref', 'Booked On',
        'Customer Name', 'Phone', 'City',
        'Event', 'Section', 'Seat', 'Unit Price (INR)',
        'Tickets in Booking', 'Total Amount (INR)',
        'Payment Method', 'Payment Details', 'Booking Status', 'Payment Status'
      ];

      const rows: string[][] = [];
      let ticketNo = 1;
      bks.forEach(b => {
        const profile = profileMap.get(b.user_id);
        const pay = payMap.get(b.id);
        const sec = b.section_id ? sectionMap.get(b.section_id) : null;
        const seats: string[] = (b.booked_seat_ids as string[] | null) || [];
        const seatLabels = seats.length ? seats.map(s => s.split('-').pop() || s) : ['General'];
        const payDetails = pay?.payment_method === 'card'
          ? `****${pay.card_last_four || ''}`
          : pay?.upi_id || '—';

        seatLabels.forEach(seatLabel => {
          rows.push([
            String(ticketNo++).padStart(4, '0'),
            b.id.slice(0, 8),
            pay?.transaction_ref || '—',
            new Date(b.created_at).toLocaleString('en-IN'),
            profile?.display_name || 'Guest',
            profile?.phone || '—',
            profile?.city || '—',
            eventTitle,
            sec?.section_name || 'General',
            seatLabel,
            String(sec?.price ?? Math.round(Number(b.total_amount) / Math.max(b.tickets, 1))),
            String(b.tickets),
            String(b.total_amount),
            pay?.payment_method?.toUpperCase() || '—',
            payDetails,
            b.status,
            b.payment_status,
          ]);
        });
      });

      const escape = (v: string) => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = eventTitle.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      a.href = url;
      a.download = `tickets_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} ticket${rows.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error('Export failed');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`admin-monitor-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `event_id=eq.${eventId}` }, () => {
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading seat map…</p>;
  if (!sections.length) return <p className="text-sm text-muted-foreground">No venue sections configured for this event.</p>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{eventTitle}</h3>
          <p className="text-xs text-muted-foreground">Live seat occupancy — auto-refreshes on new bookings</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
            <Users className="h-3.5 w-3.5 text-primary" /> {bookingCount} bookings
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 text-destructive px-3 py-1.5">
            <Armchair className="h-3.5 w-3.5" /> {bookedSeats.length} seats booked
          </span>
          <button onClick={exportCSV} disabled={exporting || bookedSeats.length === 0} className="flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
            <Download className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button onClick={refresh} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 hover:bg-secondary transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <VenueSeatMap
        sections={sections}
        tickets={0}
        selectedSection={selectedSection}
        onSelectSection={(s) => setSelectedSection(s as VenueSection)}
        onSelectSeat={() => {}}
        selectedSeats={[]}
        bookedSeats={bookedSeats}
        readOnly
      />
    </motion.div>
  );
};

export default LiveSeatMonitor;
