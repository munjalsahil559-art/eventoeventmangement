import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Lock, ExternalLink } from 'lucide-react';

interface PayeeAccount {
  account_holder_name: string;
  upi_id: string | null;
}

interface UpiPaymentFormProps {
  total: number;
  eventTitle: string;
  processing: boolean;
  payee?: PayeeAccount | null;
  onPay: (upiId: string) => void;
}

const UpiPaymentForm = ({ total, eventTitle, processing, payee, onPay }: UpiPaymentFormProps) => {
  const [upiId, setUpiId] = useState('');

  const merchantUpi = payee?.upi_id || 'evento@upi';
  const merchantName = payee?.account_holder_name || 'Evento';
  const txnNote = `Booking: ${eventTitle}`;

  // UPI payment link for QR code and deep-link
  const upiPaymentLink = `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${total}&cu=INR&tn=${encodeURIComponent(txnNote)}`;

  const isValidUpi = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upiId);

  // Build deep-link with user's UPI ID as payer
  const buildDeepLink = (payerVpa: string) => {
    return `upi://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${total}&cu=INR&tn=${encodeURIComponent(txnNote)}&payer.vpa=${encodeURIComponent(payerVpa)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUpi) return;

    // Try opening UPI app via deep-link
    const deepLink = buildDeepLink(upiId);
    
    // On mobile, this will open the UPI app
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try intent-based deep-link for Android
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        // Android intent URL - opens UPI app chooser
        const intentUrl = `intent://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${total}&cu=INR&tn=${encodeURIComponent(txnNote)}#Intent;scheme=upi;package=;end;`;
        window.location.href = intentUrl;
      } else {
        // iOS - try direct UPI link
        window.location.href = deepLink;
      }
    } else {
      // Desktop - just open the link (may not work, QR is preferred)
      window.open(deepLink, '_blank');
    }

    // Proceed with payment processing after a delay (simulating UPI confirmation)
    setTimeout(() => {
      onPay(upiId);
    }, 2000);
  };

  const handleOpenApp = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `intent://pay?pa=${encodeURIComponent(merchantUpi)}&pn=${encodeURIComponent(merchantName)}&am=${total}&cu=INR&tn=${encodeURIComponent(txnNote)}#Intent;scheme=upi;package=;end;`;
    } else {
      window.location.href = upiPaymentLink;
    }
  };

  const inputClass = "w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <h3 className="flex items-center gap-2 font-display font-semibold">
          <Smartphone className="h-5 w-5 text-primary" /> UPI Payment
        </h3>

        {!payee?.upi_id && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-[11px] text-orange-300">
            ⚠️ Organizer hasn't set up a UPI ID yet — using a demo VPA. Real payment cannot be received.
          </div>
        )}

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

          {/* Open UPI app button (mobile) */}
          <button
            type="button"
            onClick={handleOpenApp}
            className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <ExternalLink className="h-4 w-4" /> Open UPI App
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">OR enter UPI ID</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Manual UPI ID entry */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Your UPI ID</label>
            <input
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className={inputClass}
            />
            {upiId && !isValidUpi && (
              <p className="mt-1 text-xs text-destructive">Enter a valid UPI ID (e.g. name@bank)</p>
            )}
            {upiId && isValidUpi && (
              <p className="mt-1 text-xs text-green-500">✓ Valid UPI ID — clicking pay will open your UPI app for approval</p>
            )}
          </div>

          <button
            type="submit"
            disabled={processing || !isValidUpi}
            className="w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Lock className="h-3.5 w-3.5" />
            {processing ? 'Waiting for UPI approval...' : `Pay ₹${total.toLocaleString()} via UPI`}
          </button>

          <p className="text-[10px] text-center text-muted-foreground">
            Your UPI app (GPay, PhonePe, Paytm) will open and ask you to approve the payment
          </p>
        </form>

        {/* Payment Info */}
        <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice Details</p>
          <div className="text-xs space-y-0.5 text-muted-foreground">
            <p>Payee: {merchantName}</p>
            <p>UPI ID: <span className="font-mono text-foreground">{merchantUpi}</span></p>
            <p>Amount: ₹{total.toLocaleString()}</p>
            <p>For: {eventTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpiPaymentForm;
