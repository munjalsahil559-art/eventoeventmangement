import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Calendar, Heart } from 'lucide-react';
import { useState } from 'react';
import { computeDynamicPrice, priceBadgeClasses } from '@/lib/dynamicPricing';

export interface DbEvent {
  id: string;
  title: string;
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
  is_featured: boolean | null;
  description: string | null;
}

const EventCard = ({ event, index = 0 }: { event: DbEvent; index?: number }) => {
  const [wishlisted, setWishlisted] = useState(false);
  const dyn = computeDynamicPrice(event);
  const surging = dyn.label === 'surge';
  const deal = dyn.label === 'deal';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link to={`/event/${event.id}`} className="group block">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
          <div className="relative aspect-[3/2] overflow-hidden">
            <img
              src={event.image_url || '/placeholder.svg'}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <button
              onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
              className="absolute right-3 top-3 rounded-full bg-background/60 p-2 backdrop-blur-sm transition-colors hover:bg-background/80"
            >
              <Heart className={`h-4 w-4 ${wishlisted ? 'fill-primary text-primary' : 'text-foreground'}`} />
            </button>
            {event.is_featured && (
              <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                Featured
              </span>
            )}
            <div className="absolute bottom-3 left-3">
              <div className="flex items-end gap-1.5">
                <span className="rounded-md bg-background/70 px-2 py-1 text-lg font-bold backdrop-blur-sm">
                  ₹{dyn.price}
                </span>
                {dyn.price !== dyn.base && (
                  <span className="rounded-md bg-background/60 px-1.5 py-0.5 text-[10px] line-through text-muted-foreground backdrop-blur-sm">
                    ₹{dyn.base}
                  </span>
                )}
              </div>
            </div>
            {(surging || deal) && (
              <span className={`absolute right-3 bottom-3 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${priceBadgeClasses(dyn.label)}`}>
                {surging ? '🔥 Surge' : '💸 Deal'}
              </span>
            )}
          </div>
          <div className="p-4">
            <h3 className="mb-1 font-display text-base font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-accent text-accent" />
                {event.rating ?? 0}
              </span>
              <span>·</span>
              <span>{event.tickets_sold} sold</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.city}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;
