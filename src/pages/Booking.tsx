import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, MapPin, Clock, CreditCard } from 'lucide-react';
import { events } from '@/data/events';
import { toast } from 'sonner';

const Booking = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const event = events.find((e) => e.id === id);
  const tickets = parseInt(searchParams.get('tickets') || '1');
  const [step, setStep] = useState<'confirm' | 'payment' | 'success'>('confirm');
  const [processing, setProcessing] = useState(false);

  if (!event) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Event not found.</p></div>;

  const subtotal = event.price * tickets;
  const fee = Math.round(subtotal * 0.05);
  const total = subtotal + fee;

  const handlePayment = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStep('success');
      toast.success('Booking confirmed!');
    }, 2000);
  };

  if (step === 'success') {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md text-center">
          <CheckCircle className="mx-auto mb-4 h-20 w-20 text-green-500" />
          <h1 className="mb-2 font-display text-3xl font-bold">Booking Confirmed!</h1>
          <p className="mb-6 text-muted-foreground">Your tickets for {event.title} have been booked successfully.</p>
          <div className="mb-6 rounded-xl border border-border bg-card p-4 text-left text-sm space-y-2">
            <p><span className="text-muted-foreground">Booking ID:</span> EVT-{Math.random().toString(36).substr(2, 8).toUpperCase()}</p>
            <p><span className="text-muted-foreground">Event:</span> {event.title}</p>
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
      <h1 className="mb-6 font-display text-3xl font-bold">{step === 'confirm' ? 'Confirm Booking' : 'Payment'}</h1>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex gap-4">
            <img src={event.image} alt={event.title} className="h-24 w-36 rounded-lg object-cover" />
            <div>
              <h2 className="font-display text-lg font-semibold">{event.title}</h2>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{event.time}</p>
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{event.venue}, {event.city}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{tickets} × ₹{event.price}</span><span>₹{subtotal}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Convenience Fee</span><span>₹{fee}</span></div>
          <div className="border-t border-border pt-3 flex justify-between text-base font-bold"><span>Total</span><span className="text-gradient">₹{total}</span></div>
        </div>

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
