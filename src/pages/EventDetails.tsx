import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Calendar, Clock, Users, Minus, Plus, ArrowLeft, Heart, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeDynamicPrice, priceBadgeClasses } from '@/lib/dynamicPricing';
import LiveAvailability from '@/components/LiveAvailability';

interface DbEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  date: string;
  time: string | null;
  venue: string | null;
  city: string;
  price: number;
  rating: number | null;
  tickets_sold: number;
  capacity: number;
}

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<DbEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', id!).single();
      if (!error && data) setEvent(data);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!event) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Event not found.</p></div>;

  const dyn = computeDynamicPrice(event);
  const livePrice = dyn.price;

  const handleBook = () => {
    navigate(`/booking/${event.id}?tickets=${tickets}&dp=${livePrice}`);
  };

  return (
    <div className="container mx-auto py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden rounded-2xl">
            <img src={event.image_url || '/placeholder.svg'} alt={event.title} className="aspect-[2/1] w-full object-cover" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 space-y-6">
            <div>
              <span className="mb-2 inline-block rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">{event.category}</span>
              <h1 className="font-display text-3xl font-bold md:text-4xl">{event.title}</h1>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> {event.rating ?? 0}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {event.city}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 font-display text-lg font-semibold">Event Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium">{new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div></div>
                {event.time && <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Time</p><p className="text-sm font-medium">{event.time}</p></div></div>}
                {event.venue && <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Venue</p><p className="text-sm font-medium">{event.venue}</p></div></div>}
                <div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Availability</p><p className="text-sm font-medium">{(event.capacity - event.tickets_sold).toLocaleString()} seats left</p></div></div>
              </div>
            </div>

            {event.description && (
              <div>
                <h3 className="mb-3 font-display text-lg font-semibold">About</h3>
                <p className="leading-relaxed text-muted-foreground">{event.description}</p>
              </div>
            )}

            <LiveAvailability eventId={event.id} capacity={event.capacity} />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <div className="sticky top-24 space-y-4 rounded-xl border border-border bg-card p-5">
            <div>
              <p className="text-sm text-muted-foreground">Price per ticket</p>
              <div className="flex items-baseline gap-2">
                <p className="font-display text-3xl font-bold text-gradient">₹{livePrice}</p>
                {livePrice !== dyn.base && (
                  <p className="text-sm line-through text-muted-foreground">₹{dyn.base}</p>
                )}
              </div>
              <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priceBadgeClasses(dyn.label)}`}>
                {dyn.label === 'surge' ? '🔥' : dyn.label === 'deal' ? '💸' : '✨'} {dyn.reason}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Live pricing · {dyn.daysLeft === 0 ? 'today' : `${dyn.daysLeft} day${dyn.daysLeft === 1 ? '' : 's'} left`} · {Math.round(dyn.demandRatio * 100)}% sold
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">Tickets</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setTickets(Math.max(1, tickets - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-secondary"><Minus className="h-4 w-4" /></button>
                <span className="w-6 text-center font-semibold">{tickets}</span>
                <button onClick={() => setTickets(Math.min(10, tickets + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-secondary"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-secondary p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{livePrice * tickets}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Convenience Fee</span><span>₹{Math.round(livePrice * tickets * 0.05)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold"><span>Total</span><span>₹{Math.round(livePrice * tickets * 1.05)}</span></div>
            </div>

            <button onClick={handleBook} className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 animate-pulse-glow">
              Book Now
            </button>

            <div className="flex gap-2">
              <button onClick={() => { setWishlisted(!wishlisted); toast(wishlisted ? 'Removed from wishlist' : 'Added to wishlist'); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm transition-colors hover:bg-secondary">
                <Heart className={`h-4 w-4 ${wishlisted ? 'fill-primary text-primary' : ''}`} /> {wishlisted ? 'Saved' : 'Save'}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast('Link copied!'); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm transition-colors hover:bg-secondary">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EventDetails;
