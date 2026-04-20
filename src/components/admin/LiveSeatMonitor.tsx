import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Armchair, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
