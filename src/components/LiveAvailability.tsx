import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, Armchair } from 'lucide-react';
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

interface LiveAvailabilityProps {
  eventId: string;
  capacity: number;
}

const LiveAvailability = ({ eventId, capacity }: LiveAvailabilityProps) => {
  const [sections, setSections] = useState<VenueSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<VenueSection | null>(null);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [seatsSold, setSeatsSold] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [{ data: secs }, { data: bks }] = await Promise.all([
      supabase.from('venue_sections').select('*').eq('event_id', eventId),
      supabase.from('bookings').select('tickets, booked_seat_ids').eq('event_id', eventId),
    ]);
    const list = (secs || []) as VenueSection[];
    setSections(list);
    if (list.length && !selectedSection) setSelectedSection(list[0]);
    const allSeats = (bks || []).flatMap(b => (b.booked_seat_ids as string[] | null) || []);
    setBookedSeats(allSeats);
    const totalTickets = (bks || []).reduce((sum, b) => sum + (b.tickets || 0), 0);
    setSeatsSold(totalTickets);
    setBookingsCount(bks?.length || 0);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`live-avail-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `event_id=eq.${eventId}` }, () => {
        setPulse(true);
        refresh();
        setTimeout(() => setPulse(false), 1500);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (loading) return null;

  const seatsLeft = Math.max(0, capacity - seatsSold);
  const pctSold = capacity > 0 ? Math.min(100, Math.round((seatsSold / capacity) * 100)) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`relative flex h-2 w-2`}>
            <span className={`absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 ${pulse ? 'animate-ping' : 'animate-pulse'}`} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Live Availability
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
            <Users className="h-3 w-3 text-primary" /> {bookingsCount} bookings
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-2.5 py-1">
            <Armchair className="h-3 w-3" /> {seatsSold} sold
          </span>
          <span className="rounded-full bg-emerald-500/15 text-emerald-500 px-2.5 py-1 font-semibold">
            {seatsLeft} left
          </span>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mb-4 space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctSold}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${pctSold >= 85 ? 'bg-destructive' : pctSold >= 60 ? 'bg-orange-500' : 'bg-primary'}`}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {pctSold}% sold of {capacity.toLocaleString()} seats
          {pctSold >= 85 && <span className="ml-2 font-semibold text-destructive">🔥 Almost sold out!</span>}
          {pctSold >= 60 && pctSold < 85 && <span className="ml-2 font-semibold text-orange-500">Selling fast</span>}
        </p>
      </div>

      {sections.length > 0 ? (
        <>
          <p className="mb-2 text-[11px] text-muted-foreground">Booked seats update in real-time as people purchase.</p>
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
        </>
      ) : (
        <p className="text-sm text-muted-foreground">General admission — no assigned seating.</p>
      )}
    </motion.div>
  );
};

export default LiveAvailability;