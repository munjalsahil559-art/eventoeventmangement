import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { events } from '@/data/events';

const featured = events.filter((e) => e.featured).slice(0, 4);

const HeroBanner = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((p) => (p + 1) % featured.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const event = featured[current];

  return (
    <div className="relative h-[420px] overflow-hidden rounded-2xl md:h-[500px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={event.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <img src={event.image} alt={event.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="mb-2 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
            {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
          </span>
          <h2 className="mb-2 font-display text-3xl font-bold md:text-5xl">{event.title}</h2>
          <p className="mb-4 max-w-lg text-sm text-muted-foreground md:text-base">{event.description}</p>
          <div className="flex items-center gap-4">
            <Link
              to={`/event/${event.id}`}
              className="gradient-primary rounded-lg px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Book Now — ₹{event.price}
            </Link>
            <span className="text-sm text-muted-foreground">{event.venue}</span>
          </div>
        </motion.div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-6 right-6 flex gap-2 md:right-10">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;
