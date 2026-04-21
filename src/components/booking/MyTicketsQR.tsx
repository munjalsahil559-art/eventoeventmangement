import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Ticket as TicketIcon, CheckCircle2, XCircle, Calendar, MapPin, Clock, Armchair, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TicketRow {
  id: string;
  ticket_code: string;
  seat_label: string;
  status: string;
  checked_in_at: string | null;
  event_id: string;
  events?: { title: string; date: string; time: string | null; venue: string | null; city: string } | null;
  venue_sections?: { section_name: string } | null;
}

interface Props {
  bookingId: string;
}

const statusStyle = (status: string) => {
  if (status === 'used') return 'bg-muted text-muted-foreground';
  if (status === 'cancelled') return 'bg-destructive/15 text-destructive';
  return 'bg-green-500/15 text-green-500';
};

const MyTicketsQR = ({ bookingId }: Props) => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('id, ticket_code, seat_label, status, checked_in_at, event_id, events(title, date, time, venue, city), venue_sections(section_name)')
        .eq('booking_id', bookingId)
        .order('seat_label');
      if (!cancelled) {
        setTickets((data as unknown as TicketRow[]) || []);
        setLoading(false);
      }
    };
    load();

    // Listen for status changes (e.g., scanned at gate)
    const channel = supabase
      .channel(`tickets-${bookingId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `booking_id=eq.${bookingId}` }, (payload) => {
        const updated = payload.new as TicketRow;
        setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [bookingId]);

  const downloadTicket = (ticket: TicketRow) => {
    const svg = document.getElementById(`qr-${ticket.id}`);
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticket.ticket_code}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-4">Generating tickets...</p>;
  if (!tickets.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TicketIcon className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Your e-Tickets ({tickets.length})</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tickets.map((ticket, i) => {
          const isUsed = ticket.status === 'used';
          return (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Perforated edge effect */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between px-2 pointer-events-none">
                <div className="h-4 w-4 rounded-full bg-background -translate-x-1/2" />
                <div className="h-4 w-4 rounded-full bg-background translate-x-1/2" />
              </div>

              <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_code.slice(0, 16)}…</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusStyle(ticket.status)}`}>
                  {isUsed ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> CHECKED IN</span> : ticket.status === 'cancelled' ? <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> VOID</span> : 'VALID'}
                </span>
              </div>

              <div className="p-4 flex gap-4">
                <div className={`flex-shrink-0 rounded-lg bg-white p-2 ${isUsed ? 'opacity-40 grayscale' : ''}`}>
                  <QRCodeSVG
                    id={`qr-${ticket.id}`}
                    value={ticket.ticket_code}
                    size={96}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-display font-semibold text-sm truncate">{ticket.events?.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Armchair className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{ticket.venue_sections?.section_name || 'GA'} · Seat {ticket.seat_label}</span>
                  </div>
                  {ticket.events?.date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>{new Date(ticket.events.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      {ticket.events.time && <><Clock className="h-3 w-3 ml-1 flex-shrink-0" /><span>{ticket.events.time}</span></>}
                    </div>
                  )}
                  {ticket.events?.venue && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{ticket.events.venue}</span>
                    </div>
                  )}
                  <button
                    onClick={() => downloadTicket(ticket)}
                    className="mt-1 flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <Download className="h-3 w-3" /> Save QR
                  </button>
                </div>
              </div>

              {isUsed && ticket.checked_in_at && (
                <div className="px-4 pb-3 text-[10px] text-muted-foreground">
                  Entered: {new Date(ticket.checked_in_at).toLocaleString('en-IN')}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MyTicketsQR;
