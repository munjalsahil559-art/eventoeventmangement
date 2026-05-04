import { ShieldCheck, Building2, Smartphone, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PayoutAccount {
  account_holder_name: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
}

interface OrganizerPayoutPanelProps {
  payee: PayoutAccount;
  amount: number;
}

const OrganizerPayoutPanel = ({ payee, amount }: OrganizerPayoutPanelProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => toast.error('Could not copy'));
  };

  const Row = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-xs text-foreground truncate">{value}</span>
        {copyable && (
          <button
            type="button"
            onClick={() => copy(label, value)}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            aria-label={`Copy ${label}`}
          >
            {copied === label ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );

  const hasBank = !!(payee.bank_name || payee.account_number || payee.ifsc_code);
  const hasUpi = !!payee.upi_id;

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-4 w-4 text-green-400 shrink-0" />
          <h3 className="font-display text-sm font-semibold truncate">
            Paying organizer · <span className="text-foreground">{payee.account_holder_name}</span>
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400 shrink-0">
          <ShieldCheck className="h-3 w-3" /> Verified
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        ₹{amount.toLocaleString()} will be settled to the account below. Confirm these details before scanning the QR or paying.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {hasUpi && (
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
              <Smartphone className="h-3 w-3" /> UPI
            </div>
            <Row label="UPI ID" value={payee.upi_id!} copyable />
            <Row label="Payee name" value={payee.account_holder_name} />
          </div>
        )}
        {hasBank && (
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
              <Building2 className="h-3 w-3" /> Bank account
            </div>
            {payee.bank_name && <Row label="Bank" value={payee.bank_name} />}
            {payee.account_number && (
              <Row label="A/C" value={`••••${payee.account_number.slice(-4)}`} />
            )}
            {payee.ifsc_code && <Row label="IFSC" value={payee.ifsc_code} copyable />}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerPayoutPanel;