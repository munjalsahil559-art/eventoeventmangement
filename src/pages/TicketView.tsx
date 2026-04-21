import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Armchair, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TicketDetails {
  ticket_code: string;
  seat_label: string;
  status: string;
  events: {
    title: string;
    date: string;
    time: string | null;
    venue: string | null;
    city: string;
  } | null;
  venue_sections: {
    section_name: string;
  } | null;
}

const TicketView = () => {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketCode) return;
    
    const loadTicket = async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('ticket_code, seat_label, status, events(title, date, time, venue, city), venue_sections(section_name)')
        .eq('ticket_code', ticketCode)
        .single();
      
      if (error || !data) {
        setError('Ticket not found or invalid');
        setLoading(false);
        return;
      }
      
      setTicket(data as unknown as TicketDetails);
      setLoading(false);
    };
    
    loadTicket();
  }, [ticketCode]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-md py-12 text-center">
        <div className="animate-pulse">
          <div className="h-32 bg-card rounded-xl mb-4" />
          <div className="h-4 bg-card rounded w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto max-w-md py-12">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-display font-semibold mb-2">Ticket Not Found</h2>
          <p className="text-muted-foreground">{error || 'This ticket code is invalid.'}</p>
        </div>
      </div>
    );
  }

  const isUsed = ticket.status === 'used';
  const isCancelled = ticket.status === 'cancelled';

  return (
    <div className="container mx-auto max-w-md py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-4">
          <h1 className="font-display text-lg font-bold truncate">{ticket.events?.title}</h1>
          <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_code}</p>
        </div>

        {/* Status Badge */}
        <div className="px-6 py-3 border-b border-border">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
            isUsed ? 'bg-muted text-muted-foreground' :
            isCancelled ? 'bg-destructive/15 text-destructive' :
            'bg-green-500/15 text-green-500'
          }`}>
            {isUsed ? 'CHECKED IN' : isCancelled ? 'VOID' : 'VALID'}
          </span>
        </div>

        {/* QR Code */}
        <div className="p-8 flex flex-col items-center">
          <div className={`rounded-xl bg-white p-4 ${isUsed || isCancelled ? 'opacity-40 grayscale' : ''}`}>
            <QRCodeSVG
              value={ticket.ticket_code}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Show this QR code at the venue entrance
          </p>
        </div>

        {/* Ticket Details */}
        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Armchair className="h-4 w-4 text-primary flex-shrink-0" />
            <span>{ticket.venue_sections?.section_name || 'General Admission'} · Seat {ticket.seat_label}</span>
          </div>
          
          {ticket.events?.date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
              <span>
                {new Date(ticket.events.date).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
                {ticket.events.time && <span className="text-muted-foreground"> · {ticket.events.time}</span>}
              </span>
            </div>
          )}
          
          {ticket.events?.venue && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span>{ticket.events.venue}, {ticket.events.city}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/50 px-6 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by Evento
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default TicketView;
