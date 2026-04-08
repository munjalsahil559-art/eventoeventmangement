import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';

interface CardPaymentFormProps {
  total: number;
  processing: boolean;
  onPay: (cardDetails: { cardNumber: string; cardHolder: string; expiry: string; cvv: string }) => void;
}

const CardPaymentForm = ({ total, processing, onPay }: CardPaymentFormProps) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const isValid = cardNumber.replace(/\s/g, '').length === 16 && cardHolder.length > 2 && expiry.length === 5 && cvv.length >= 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onPay({ cardNumber, cardHolder, expiry, cvv });
  };

  const inputClass = "w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="flex items-center gap-2 font-display font-semibold">
          <CreditCard className="h-5 w-5 text-primary" /> Card Details
        </h3>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Card Number</label>
          <div className="relative">
            <input
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              className={inputClass}
              maxLength={19}
            />
            <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Card Holder Name</label>
          <input
            value={cardHolder}
            onChange={e => setCardHolder(e.target.value)}
            placeholder="John Doe"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Expiry Date</label>
            <input
              value={expiry}
              onChange={e => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className={inputClass}
              maxLength={5}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">CVV</label>
            <input
              value={cvv}
              onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="123"
              className={inputClass}
              maxLength={4}
              type="password"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={processing || !isValid}
        className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Lock className="h-3.5 w-3.5" />
        {processing ? 'Processing...' : `Pay ₹${total.toLocaleString()}`}
      </button>
    </form>
  );
};

export default CardPaymentForm;
