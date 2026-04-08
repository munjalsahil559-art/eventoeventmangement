import { motion } from 'framer-motion';
import { Receipt, Calendar, MapPin, Clock, Armchair, Hash } from 'lucide-react';

interface InvoiceProps {
  event: { title: string; date: string; time: string | null; venue: string | null; city: string };
  sectionName?: string;
  seats: string[];
  tickets: number;
  unitPrice: number;
  subtotal: number;
  fee: number;
  total: number;
  transactionRef?: string;
  paymentMethod?: string;
}

const PaymentInvoice = ({ event, sectionName, seats, tickets, unitPrice, subtotal, fee, total, transactionRef, paymentMethod }: InvoiceProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Invoice header */}
      <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <span className="font-display font-semibold text-sm">Payment Invoice</span>
        </div>
        {transactionRef && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Hash className="h-3 w-3" />{transactionRef}
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Event info */}
        <div className="space-y-1.5 text-sm">
          <p className="font-display font-semibold">{event.title}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {event.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}</span>}
            {event.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.venue}, {event.city}</span>}
          </div>
        </div>

        <div className="border-t border-dashed border-border" />

        {/* Line items */}
        <div className="space-y-2 text-sm">
          {sectionName && (
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Armchair className="h-3.5 w-3.5" /> Section</span>
              <span className="font-medium">{sectionName}</span>
            </div>
          )}
          {seats.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seats</span>
              <span className="font-mono text-xs">{seats.map(s => s.split('-').pop()).join(', ')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tickets</span>
            <span>{tickets} × ₹{unitPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Convenience Fee (5%)</span>
            <span>₹{fee.toLocaleString()}</span>
          </div>
        </div>

        <div className="border-t border-border" />

        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span className="text-gradient">₹{total.toLocaleString()}</span>
        </div>

        {paymentMethod && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Payment Method</span>
            <span className="capitalize">{paymentMethod === 'upi' ? 'UPI' : 'Credit/Debit Card'}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PaymentInvoice;
