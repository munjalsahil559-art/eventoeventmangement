import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, MapPin, Clock, CreditCard, Armchair } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
}

const seatColors: Record<string, string> = {
  VIP: 'border-accent bg-accent/10 text-accent',
  Gold: 'border-yellow-500 bg-yellow-500/10 text-yellow-400',
  Silver: 'border-muted-foreground bg-secondary text-muted-foreground',
  Platinum: 'border-primary bg-primary/10 text-primary',
};

const Booking = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tickets = parseInt(searchParams.get('tickets') || '1');

  const [event, setEvent] = useState<DbEvent | null>(null);
  const [sections, setSections] = useState<VenueSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<VenueSection | null>(null);
  const [step, setStep] = useState<'seats' | 'confirm' | 'payment' | 'success'>('seats');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    const load = async () => {
      const { data: ev } = await supabase.from('events').select('id, title, date, time, venue, city, price, image_url').eq('id', id!).single();
      if (!ev) { setLoading(false); return; }
      setEvent(ev);
      const { data: secs } = await supabase.from('venue_sections').select('*').eq('event_id', id!);
      setSections(secs || []);
      setLoading(false);
    };
    load();
  }, [id, user]);

  if (loading) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!event) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Event not found.</p></div>;

  const unitPrice = selectedSection ? selectedSection.price : event.price;
  const subtotal = unitPrice * tickets;
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;

  const handlePayment = async () => {
    setProcessing(true);
    const { error } = await supabase.from('bookings').insert({
      user_id: user!.id,
      event_id: event.id,
      tickets,
      total_amount: total,
      section_id: selectedSection?.id || null,
    });
    if (error) {
      toast.error('Booking failed: ' + error.message);
      setProcessing(false);
      return;
    }
    setProcessing(false);
    setStep('success');
    toast.success('Booking confirmed!');
  };

  if (step === 'success') {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md text-center">
          <CheckCircle className="mx-auto mb-4 h-20 w-20 text-green-500" />
          <h1 className="mb-2 font-display text-3xl font-bold">Booking Confirmed!</h1>
          <p className="mb-6 text-muted-foreground">Your tickets for {event.title} have been booked successfully.</p>
          <div className="mb-6 rounded-xl border border-border bg-card p-4 text-left text-sm space-y-2">
            <p><span className="text-muted-foreground">Event:</span> {event.title}</p>
            {selectedSection && <p><span className="text-muted-foreground">Section:</span> {selectedSection.section_name}</p>}
            <p><span className="text-muted-foreground">Tickets:</span> {tickets}</p>
            <p><span className="text-muted-foreground">Total Paid:</span> ₹{total}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/')} className="rounded-lg border border-border px-6 py-2.5 text-sm transition-colors hover:bg-secondary">Go Home</button>
            <button onClick={() => navigate('/profile')} className="gradient-primary rounded-lg px-6 py-2.5 text-sm font-semibold text-primary-foreground">View Bookings</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-6">
      <h1 className="mb-6 font-display text-3xl font-bold">
        {step === 'seats' ? 'Select Your Seats' : step === 'confirm' ? 'Confirm Booking' : 'Payment'}
      </h1>

      <div className="space-y-4">
        {/* Event info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex gap-4">
            {event.image_url && <img src={event.image_url} alt={event.title} className="h-24 w-36 rounded-lg object-cover" />}
            <div>
              <h2 className="font-display text-lg font-semibold">{event.title}</h2>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {event.time && <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{event.time}</p>}
                {event.venue && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{event.venue}, {event.city}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Seat Selection */}
        {step === 'seats' && (
          <div className="space-y-4">
            {sections.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">Choose a seating section:</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sections.map((sec) => {
                    const colorClass = seatColors[sec.section_name] || 'border-border bg-secondary text-foreground';
                    const isSelected = selectedSection?.id === sec.id;
                    const soldOut = sec.available_seats < tickets;
                    return (
                      <button
                        key={sec.id}
                        disabled={soldOut}
                        onClick={() => setSelectedSection(sec)}
                        className={`relative rounded-xl border-2 p-4 text-left transition-all ${soldOut ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'} ${isSelected ? colorClass + ' ring-2 ring-offset-2 ring-offset-background ring-primary' : 'border-border bg-card'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Armchair className="h-5 w-5" />
                          <span className="font-display font-semibold text-lg">{sec.section_name}</span>
                        </div>
                        <p className="text-2xl font-bold">₹{sec.price}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {soldOut ? 'Sold Out' : `${sec.available_seats} seats available`}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => { if (!selectedSection) { toast.error('Please select a section'); return; } setStep('confirm'); }}
                  className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Continue with {selectedSection?.section_name || '...'} — ₹{unitPrice}/ticket
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <Armchair className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No specific seating sections for this event. General admission at ₹{event.price}/ticket.</p>
                </div>
                <button
                  onClick={() => setStep('confirm')}
                  className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Continue — ₹{event.price}/ticket
                </button>
              </>
            )}
          </div>
        )}

        {/* Price summary */}
        {(step === 'confirm' || step === 'payment') && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
            {selectedSection && (
              <div className="flex justify-between"><span className="text-muted-foreground">Section</span><span className="font-medium">{selectedSection.section_name}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">{tickets} × ₹{unitPrice}</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Convenience Fee</span><span>₹{fee}</span></div>
            <div className="border-t border-border pt-3 flex justify-between text-base font-bold"><span>Total</span><span className="text-gradient">₹{total}</span></div>
          </div>
        )}

        {step === 'confirm' && (
          <button onClick={() => setStep('payment')} className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Proceed to Payment
          </button>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h3 className="flex items-center gap-2 font-display font-semibold"><CreditCard className="h-5 w-5 text-primary" /> Payment Details</h3>
              <input placeholder="Card Number" className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" defaultValue="4242 4242 4242 4242" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="MM/YY" className="rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" defaultValue="12/28" />
                <input placeholder="CVV" className="rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" defaultValue="123" />
              </div>
            </div>
            <button onClick={handlePayment} disabled={processing} className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
              {processing ? 'Processing...' : `Pay ₹${total}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;
