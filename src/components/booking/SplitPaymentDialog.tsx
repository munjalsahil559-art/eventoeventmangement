import { useState } from 'react';
import { Users, Link2, Copy, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SplitPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  sectionId?: string | null;
  seatIds: string[];
  unitPrice: number;
  feePerSeat: number;
}

const SplitPaymentDialog = ({ open, onClose, eventId, sectionId, seatIds, unitPrice, feePerSeat }: SplitPaymentDialogProps) => {
  const { user } = useAuth();
  const perSeat = unitPrice + feePerSeat;
  const [assignees, setAssignees] = useState<string[]>(() => seatIds.map((_, i) => i === 0 ? 'You' : ''));
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  const updateName = (i: number, val: string) => {
    const next = [...assignees];
    next[i] = val;
    setAssignees(next);
  };

  const createSplit = async () => {
    if (!user) { toast.error('Login required'); return; }
    if (assignees.some(a => !a.trim())) { toast.error('Name every seat assignee'); return; }
    setCreating(true);
    const total = perSeat * seatIds.length;
    const { data: split, error } = await supabase
      .from('payment_splits')
      .insert({
        organizer_user_id: user.id,
        event_id: eventId,
        section_id: sectionId || null,
        seat_ids: seatIds,
        total_amount: total,
        unit_price: unitPrice,
        fee_per_seat: feePerSeat,
      })
      .select('id, share_token')
      .single();
    if (error || !split) { toast.error('Could not create split: ' + (error?.message || '')); setCreating(false); return; }

    const shareRows = seatIds.map((seatId, i) => ({
      split_id: split.id,
      seat_id: seatId,
      seat_label: seatId.split('-').pop() || seatId,
      assignee_name: assignees[i].trim(),
      amount: perSeat,
    }));
    const { error: sErr } = await supabase.from('payment_split_shares').insert(shareRows);
    if (sErr) { toast.error('Share creation failed'); setCreating(false); return; }

    const url = `${window.location.origin}/split/${split.share_token}`;
    setShareUrl(url);
    setCreating(false);
    toast.success('Split link ready — share it with friends');
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Split payment with friends</h2>
        </div>

        {!shareUrl ? (
          <>
            <p className="mb-4 text-xs text-muted-foreground">
              Each friend pays for their own seat. Booking confirms automatically once everyone has paid.
              <br />Per seat: <span className="font-semibold text-foreground">₹{perSeat.toLocaleString()}</span>
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {seatIds.map((seat, i) => (
                <div key={seat} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 rounded-md bg-secondary px-2 py-1.5 text-center font-mono text-xs">{seat.split('-').pop()}</span>
                  <input
                    value={assignees[i] || ''}
                    onChange={e => updateName(i, e.target.value)}
                    placeholder={`Friend ${i + 1} name`}
                    className="flex-1 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">₹{perSeat.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-secondary">Cancel</button>
              <button onClick={createSplit} disabled={creating}
                className="flex-1 gradient-primary rounded-lg py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {creating ? 'Creating…' : 'Generate share link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Send this link to your friends. They each pay for their assigned seat. Link expires in 24 hours.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1 truncate font-mono text-xs">{shareUrl}</span>
              <button onClick={copyLink} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Tip: open the link yourself to pay for your own seat. Track progress on the same page.
            </div>
            <div className="mt-4 flex gap-2">
              <a href={shareUrl} target="_blank" rel="noreferrer"
                className="flex-1 gradient-primary rounded-lg py-2.5 text-center text-sm font-semibold text-primary-foreground">
                Open split page
              </a>
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-secondary">Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SplitPaymentDialog;