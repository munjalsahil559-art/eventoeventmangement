import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, MapPin, Clock, CreditCard, Smartphone, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import VenueSeatMap from '@/components/booking/VenueSeatMap';
import PaymentInvoice from '@/components/booking/PaymentInvoice';
import CardPaymentForm from '@/components/booking/CardPaymentForm';
import UpiPaymentForm from '@/components/booking/UpiPaymentForm';
import MyTicketsQR from '@/components/booking/MyTicketsQR';
import { computeDynamicPrice, priceBadgeClasses } from '@/lib/dynamicPricing';

interface VenueSection {
  id: string;
  section_name: string;
  price: number;
  total_seats: number;
  available_seats: number;
}

interface DbEvent {
  id: string;
  title: string;
  date: string;
  time: string | null;
  venue: string | null;
  city: string;
  price: number;
  image_url: string | null;
  tickets_sold?: number;
  capacity?: number;
}

const Booking = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tickets = parseInt(searchParams.get('tickets') || '1');

  const [event, setEvent] = useState<DbEvent | null>(null);
  const [sections, setSections] = useState<VenueSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<VenueSection | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const [step, setStep] = useState<'seats' | 'payment' | 'success'>('seats');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactionRef, setTransactionRef] = useState('');
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    const load = async () => {
      const { data: ev } = await supabase.from('events').select('id, title, date, time, venue, city, price, image_url, tickets_sold, capacity').eq('id', id!).single();
      if (!ev) { setLoading(false); return; }
      setEvent(ev);
      const { data: secs } = await supabase.from('venue_sections').select('*').eq('event_id', id!);
      setSections(secs || []);
      const { data: existing } = await supabase.from('bookings').select('booked_seat_ids').eq('event_id', id!);
      const all = (existing || []).flatMap(b => (b.booked_seat_ids as string[] | null) || []);
      setBookedSeats(all);
      setLoading(false);
    };
    load();

    // Realtime: refresh booked seats when new bookings come in
    const channel = supabase
      .channel(`booking-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `event_id=eq.${id}` }, (payload) => {
        const newSeats = ((payload.new as { booked_seat_ids?: string[] }).booked_seat_ids) || [];
        if (newSeats.length) setBookedSeats(prev => Array.from(new Set([...prev, ...newSeats])));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  if (loading) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!event) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Event not found.</p></div>;

  const dyn = computeDynamicPrice({
    price: event.price,
    date: event.date,
    tickets_sold: event.tickets_sold ?? 0,
    capacity: event.capacity ?? 100,
  });
  // Apply same multiplier to section prices (relative to base) for consistency
  const baseUnit = selectedSection ? selectedSection.price : event.price;
  const unitPrice = Math.round(baseUnit * dyn.multiplier);
  const subtotal = unitPrice * tickets;
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;

  const handlePayment = async (details: { method: 'card' | 'upi'; cardNumber?: string; cardHolder?: string; upiId?: string }) => {
    setProcessing(true);

    // Create booking with seat IDs
    const { data: booking, error: bookingError } = await supabase.from('bookings').insert({
      user_id: user!.id,
      event_id: event.id,
      tickets,
      total_amount: total,
      section_id: selectedSection?.id || null,
      booked_seat_ids: selectedSeats,
    }).select('id').single();

    if (bookingError || !booking) {
      toast.error('Booking failed: ' + (bookingError?.message || 'Unknown error'));
      setProcessing(false);
      return;
    }

    // Decrement section available_seats so admin sees real count
    if (selectedSection && selectedSeats.length) {
      await supabase.from('venue_sections')
        .update({ available_seats: Math.max(0, selectedSection.available_seats - selectedSeats.length) })
        .eq('id', selectedSection.id);
    }

    // Create payment record
    const txnRef = `TXN-${Date.now().toString(36).toUpperCase()}`;
    const { error: payError } = await supabase.from('payments').insert({
      booking_id: booking.id,
      user_id: user!.id,
      amount: total,
      payment_method: details.method,
      card_last_four: details.cardNumber ? details.cardNumber.replace(/\s/g, '').slice(-4) : null,
      card_holder_name: details.cardHolder || null,
      upi_id: details.upiId || null,
      transaction_ref: txnRef,
      status: 'completed',
    });

    if (payError) {
      toast.error('Payment recording failed');
      setProcessing(false);
      return;
    }

    // Generate one ticket per seat (or per ticket count for GA)
    const seatsForTickets = selectedSeats.length ? selectedSeats : Array.from({ length: tickets }, (_, i) => `GA-${i + 1}`);
    const ticketRows = seatsForTickets.map(seatId => ({
      booking_id: booking.id,
      event_id: event.id,
      user_id: user!.id,
      section_id: selectedSection?.id || null,
      seat_label: seatId.split('-').pop() || seatId,
    }));
    const { data: createdTickets, error: ticketErr } = await supabase.from('tickets').insert(ticketRows).select('id');
    if (ticketErr) {
      console.error('Ticket generation failed', ticketErr);
      toast.warning('Booking saved but QR tickets failed to generate');
    } else {
      setBookingId(booking.id);
    }

    setTransactionRef(txnRef);
    setProcessing(false);
    setStep('success');
    toast.success(`Booking confirmed — ${createdTickets?.length || tickets} QR ticket${(createdTickets?.length || tickets) > 1 ? 's' : ''} generated!`);
  };

  // Success screen
  if (step === 'success') {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
          <div className="text-center mb-6">
            <CheckCircle className="mx-auto mb-4 h-20 w-20 text-green-500" />
            <h1 className="mb-2 font-display text-3xl font-bold">Booking Confirmed!</h1>
            <p className="text-muted-foreground">Your tickets have been booked successfully.</p>
          </div>

          <PaymentInvoice
            event={event}
            sectionName={selectedSection?.section_name}
            seats={selectedSeats}
            tickets={tickets}
            unitPrice={unitPrice}
            subtotal={subtotal}
            fee={fee}
            total={total}
            transactionRef={transactionRef}
            paymentMethod={paymentMethod}
          />

          {bookingId && (
            <div className="mt-6">
              <MyTicketsQR bookingId={bookingId} />
            </div>
          )}

          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={() => navigate('/')} className="rounded-lg border border-border px-6 py-2.5 text-sm transition-colors hover:bg-secondary">Go Home</button>
            <button onClick={() => navigate('/profile')} className="gradient-primary rounded-lg px-6 py-2.5 text-sm font-semibold text-primary-foreground">View Bookings</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Progress indicator */}
      <div className="mb-6 flex items-center gap-3">
        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${step === 'seats' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
          1. Select Seats
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${step === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
          2. Payment
        </div>
      </div>

      {/* Event info header */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex gap-4">
          {event.image_url && <img src={event.image_url} alt={event.title} className="h-20 w-32 rounded-lg object-cover" />}
          <div>
            <h2 className="font-display text-lg font-semibold">{event.title}</h2>
            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {event.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}</span>}
              {event.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.venue}, {event.city}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 1: Seat Selection */}
      {step === 'seats' && (
        <div className="space-y-6">
          {sections.length > 0 ? (
            <>
              <VenueSeatMap
                sections={sections}
                tickets={tickets}
                selectedSection={selectedSection}
                onSelectSection={setSelectedSection}
                onSelectSeat={setSelectedSeats}
                selectedSeats={selectedSeats}
                bookedSeats={bookedSeats}
              />

              {selectedSection && (
                <PaymentInvoice
                  event={event}
                  sectionName={selectedSection.section_name}
                  seats={selectedSeats}
                  tickets={tickets}
                  unitPrice={unitPrice}
                  subtotal={subtotal}
                  fee={fee}
                  total={total}
                />
              )}

              <button
                onClick={() => {
                  if (!selectedSection) { toast.error('Please select a section'); return; }
                  if (selectedSeats.length < tickets) { toast.error(`Please select ${tickets} seat(s)`); return; }
                  setStep('payment');
                }}
                disabled={!selectedSection || selectedSeats.length < tickets}
                className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Continue to Payment — {selectedSection ? `${selectedSection.section_name} ₹${total.toLocaleString()}` : 'Select seats first'}
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">General admission — ₹{event.price}/ticket</p>
              </div>

              <PaymentInvoice
                event={event}
                seats={[]}
                tickets={tickets}
                unitPrice={event.price}
                subtotal={event.price * tickets}
                fee={Math.round(event.price * tickets * 0.05)}
                total={Math.round(event.price * tickets * 1.05)}
              />

              <button
                onClick={() => setStep('payment')}
                className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Continue to Payment — ₹{Math.round(event.price * tickets * 1.05).toLocaleString()}
              </button>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Payment */}
      {step === 'payment' && (
        <div className="space-y-6">
          {/* Payment method tabs */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setPaymentMethod('card')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                paymentMethod === 'card' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-4 w-4" /> Card Payment
            </button>
            <button
              onClick={() => setPaymentMethod('upi')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                paymentMethod === 'upi' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="h-4 w-4" /> UPI Payment
            </button>
          </div>

          {/* Invoice */}
          <PaymentInvoice
            event={event}
            sectionName={selectedSection?.section_name}
            seats={selectedSeats}
            tickets={tickets}
            unitPrice={unitPrice}
            subtotal={subtotal}
            fee={fee}
            total={total}
            paymentMethod={paymentMethod}
          />

          {/* Payment form */}
          {paymentMethod === 'card' ? (
            <CardPaymentForm
              total={total}
              processing={processing}
              onPay={(details) => handlePayment({ method: 'card', cardNumber: details.cardNumber, cardHolder: details.cardHolder })}
            />
          ) : (
            <UpiPaymentForm
              total={total}
              eventTitle={event.title}
              processing={processing}
              onPay={(upiId) => handlePayment({ method: 'upi', upiId })}
            />
          )}

          <button
            onClick={() => setStep('seats')}
            className="w-full rounded-lg border border-border py-2.5 text-sm text-muted-foreground hover:bg-secondary transition-colors"
          >
            ← Back to Seat Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default Booking;
