import { useState } from 'react';
import { motion } from 'framer-motion';
import { Armchair } from 'lucide-react';

interface VenueSection {
  id: string;
  section_name: string;
  price: number;
  total_seats: number;
  available_seats: number;
}

interface VenueSeatMapProps {
  sections: VenueSection[];
  tickets: number;
  selectedSection: VenueSection | null;
  onSelectSection: (section: VenueSection) => void;
  onSelectSeat: (seatIds: string[]) => void;
  selectedSeats: string[];
}

const SECTION_COLORS: Record<string, { bg: string; border: string; selected: string; label: string }> = {
  VIP: { bg: 'bg-accent/20', border: 'border-accent', selected: 'bg-accent text-accent-foreground', label: 'text-accent' },
  Platinum: { bg: 'bg-primary/20', border: 'border-primary', selected: 'bg-primary text-primary-foreground', label: 'text-primary' },
  Gold: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', selected: 'bg-yellow-500 text-black', label: 'text-yellow-400' },
  Silver: { bg: 'bg-muted', border: 'border-muted-foreground/30', selected: 'bg-muted-foreground text-background', label: 'text-muted-foreground' },
};

const getColors = (name: string) => SECTION_COLORS[name] || SECTION_COLORS.Silver;

// Generate seat rows based on section capacity
const generateRows = (section: VenueSection) => {
  const seatsPerRow = section.section_name === 'VIP' ? 8 : section.section_name === 'Gold' ? 12 : 14;
  const totalDisplaySeats = Math.min(section.total_seats, seatsPerRow * 6); // max 6 rows
  const rows: { label: string; seats: { id: string; available: boolean }[] }[] = [];
  const unavailable = section.total_seats - section.available_seats;

  let seatNum = 0;
  for (let r = 0; r < Math.ceil(totalDisplaySeats / seatsPerRow); r++) {
    const rowLabel = String.fromCharCode(65 + r);
    const seats = [];
    for (let s = 0; s < seatsPerRow && seatNum < totalDisplaySeats; s++) {
      seatNum++;
      seats.push({ id: `${section.id}-${rowLabel}${s + 1}`, available: seatNum > unavailable });
    }
    rows.push({ label: rowLabel, seats });
  }
  return rows;
};

const VenueSeatMap = ({ sections, tickets, selectedSection, onSelectSection, onSelectSeat, selectedSeats }: VenueSeatMapProps) => {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  const handleSeatClick = (seatId: string, available: boolean) => {
    if (!available) return;
    if (selectedSeats.includes(seatId)) {
      onSelectSeat(selectedSeats.filter(s => s !== seatId));
    } else if (selectedSeats.length < tickets) {
      onSelectSeat([...selectedSeats, seatId]);
    } else {
      // Replace the first selected seat
      onSelectSeat([...selectedSeats.slice(1), seatId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage */}
      <div className="relative mx-auto max-w-lg">
        <div className="mx-auto h-8 w-3/4 rounded-t-[100%] bg-gradient-to-b from-primary/40 to-transparent border border-primary/30 flex items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/70">Stage</span>
        </div>
        <div className="mx-auto h-1 w-3/4 bg-primary/20" />
      </div>

      {/* Section selector tabs */}
      <div className="flex gap-2 justify-center flex-wrap">
        {sections.map(sec => {
          const colors = getColors(sec.section_name);
          const isSelected = selectedSection?.id === sec.id;
          const soldOut = sec.available_seats < tickets;
          return (
            <button
              key={sec.id}
              disabled={soldOut}
              onClick={() => { onSelectSection(sec); onSelectSeat([]); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-all ${
                soldOut ? 'opacity-40 cursor-not-allowed border-border' :
                isSelected ? `${colors.selected} ${colors.border} scale-105` :
                `${colors.bg} ${colors.border} hover:scale-105`
              }`}
            >
              {sec.section_name} — ₹{sec.price}
              {soldOut && ' (Sold Out)'}
            </button>
          );
        })}
      </div>

      {/* Seat grid */}
      {selectedSection && (
        <motion.div
          key={selectedSection.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className={`font-display font-semibold ${getColors(selectedSection.section_name).label}`}>
              {selectedSection.section_name} Section
            </h3>
            <p className="text-xs text-muted-foreground">
              Select {tickets} seat{tickets > 1 ? 's' : ''} · {selectedSeats.length}/{tickets} selected
            </p>
          </div>

          <div className="flex flex-col items-center gap-1.5 overflow-x-auto py-2">
            {generateRows(selectedSection).map(row => (
              <div key={row.label} className="flex items-center gap-1">
                <span className="w-5 text-center text-[10px] font-mono text-muted-foreground">{row.label}</span>
                <div className="flex gap-1">
                  {row.seats.map((seat, i) => {
                    const isSelected = selectedSeats.includes(seat.id);
                    const isHovered = hoveredSeat === seat.id;
                    const colors = getColors(selectedSection.section_name);
                    // Add aisle gap in center
                    const hasGap = i === Math.floor(row.seats.length / 2) - 1;
                    return (
                      <div key={seat.id} className={hasGap ? 'mr-3' : ''}>
                        <button
                          disabled={!seat.available}
                          onClick={() => handleSeatClick(seat.id, seat.available)}
                          onMouseEnter={() => setHoveredSeat(seat.id)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          className={`h-6 w-6 rounded-t-lg text-[8px] font-mono transition-all ${
                            !seat.available
                              ? 'bg-muted/50 text-muted-foreground/30 cursor-not-allowed'
                              : isSelected
                              ? `${colors.selected} scale-110 shadow-lg`
                              : isHovered
                              ? `${colors.bg} ${colors.border} border scale-105`
                              : 'bg-secondary border border-border hover:border-primary/50'
                          }`}
                          title={`${seat.id.split('-').pop()} ${!seat.available ? '(Booked)' : isSelected ? '(Selected)' : ''}`}
                        >
                          <Armchair className="h-3 w-3 mx-auto" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <span className="w-5 text-center text-[10px] font-mono text-muted-foreground">{row.label}</span>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-secondary border border-border" /> Available</div>
            <div className="flex items-center gap-1"><div className={`h-3 w-3 rounded-sm ${getColors(selectedSection.section_name).selected}`} /> Selected</div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-muted/50" /> Booked</div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VenueSeatMap;
