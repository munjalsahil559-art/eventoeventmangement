import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Lock, CheckCircle } from 'lucide-react';

interface UpiPaymentFormProps {
  total: number;
  eventTitle: string;
  processing: boolean;
  onPay: (upiId: string) => void;
}

const UpiPaymentForm = ({ total, eventTitle, processing, onPay }: UpiPaymentFormProps) => {
  const [upiId, setUpiId] = useState('');
  const [showQr, setShowQr] = useState(false);

  // Generate UPI payment link for QR code
  const upiPaymentLink = `upi://pay?pa=evento@upi&pn=Evento&am=${total}&cu=INR&tn=${encodeURIComponent(`Booking: ${eventTitle}`)}`;

  const isValidUpi = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUpi && !showQr) return;
    onPay(upiId || 'qr-payment');
  };

  const inputClass = "w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <h3 className="flex items-center gap-2 font-display font-semibold">
          <Smartphone className="h-5 w-5 text-primary" /> UPI Payment
        </h3>

        {/* QR Code Section */}
        <div className="flex flex-col items-center">
          <div className="rounded-xl bg-white p-4 shadow-lg">
            <QRCodeSVG
              value={upiPaymentLink}
              size={180}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0a0a0a"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Scan this QR code with any UPI app to pay
          </p>
          <p className="mt-1 font-display text-lg font-bold text-gradient">₹{total.toLocaleString()}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">OR enter UPI ID</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Manual UPI ID entry */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">UPI ID</label>
            <input
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className={inputClass}
            />
            {upiId && !isValidUpi && (
              <p className="mt-1 text-xs text-destructive">Enter a valid UPI ID (e.g. name@bank)</p>
            )}
          </div>

          <button
            type="submit"
            disabled={processing || (!isValidUpi && !showQr)}
            className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Lock className="h-3.5 w-3.5" />
            {processing ? 'Verifying Payment...' : `Pay ₹${total.toLocaleString()}`}
          </button>
        </form>

        {/* Payment Info */}
        <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice Details</p>
          <div className="text-xs space-y-0.5 text-muted-foreground">
            <p>Payee: Evento Payments</p>
            <p>UPI ID: evento@upi</p>
            <p>Amount: ₹{total.toLocaleString()}</p>
            <p>For: {eventTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpiPaymentForm;
