export interface PricingInput {
  price: number;
  date: string;
  tickets_sold: number;
  capacity: number;
}

export interface DynamicPrice {
  base: number;
  price: number;
  multiplier: number;
  label: 'surge' | 'deal' | 'normal';
  reason: string;
  daysLeft: number;
  demandRatio: number;
}

/**
 * Compute a demand- and time-aware ticket price.
 * - Higher demand (tickets_sold / capacity) → price goes up
 * - Closer to event date → price goes up
 * - Far-out event with low demand → early-bird discount
 * Final multiplier is clamped between 0.75x and 1.5x of base.
 */
export function computeDynamicPrice(ev: PricingInput): DynamicPrice {
  const base = Number(ev.price) || 0;
  const cap = Math.max(1, ev.capacity || 1);
  const sold = Math.max(0, ev.tickets_sold || 0);
  const demandRatio = Math.min(1, sold / cap);

  const eventTime = new Date(ev.date).getTime();
  const daysLeft = Math.max(0, Math.ceil((eventTime - Date.now()) / 86400000));

  // Demand: up to +40% when nearly sold out
  const demandMult = 1 + 0.4 * demandRatio;

  // Urgency: closer = pricier; far away = cheaper
  let urgencyMult = 1;
  if (daysLeft <= 2) urgencyMult = 1.2;
  else if (daysLeft <= 7) urgencyMult = 1.1;
  else if (daysLeft > 30) urgencyMult = 0.9;

  // Low-demand last-week deal
  let dealMult = 1;
  if (daysLeft <= 14 && demandRatio < 0.2) dealMult = 0.85;

  const rawMult = demandMult * urgencyMult * dealMult;
  const multiplier = Math.max(0.75, Math.min(1.5, rawMult));
  const price = Math.round(base * multiplier);

  let label: DynamicPrice['label'] = 'normal';
  let reason = 'Standard pricing';
  if (multiplier >= 1.1) {
    label = 'surge';
    if (demandRatio >= 0.7) reason = `High demand · ${Math.round(demandRatio * 100)}% sold`;
    else if (daysLeft <= 2) reason = 'Last-minute · event in <48h';
    else reason = 'Trending — selling fast';
  } else if (multiplier <= 0.92) {
    label = 'deal';
    if (daysLeft > 30) reason = 'Early-bird discount';
    else reason = 'Limited-time deal';
  }

  return { base, price, multiplier, label, reason, daysLeft, demandRatio };
}

export function priceBadgeClasses(label: DynamicPrice['label']): string {
  if (label === 'surge') return 'bg-destructive/90 text-destructive-foreground';
  if (label === 'deal') return 'bg-emerald-500/90 text-white';
  return 'bg-secondary text-muted-foreground';
}