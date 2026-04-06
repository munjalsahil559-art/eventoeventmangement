import HeroBanner from '@/components/HeroBanner';
import CategorySection from '@/components/CategorySection';
import EventCard from '@/components/EventCard';
import { events } from '@/data/events';
import { Link } from 'react-router-dom';

const trending = events.filter((e) => e.trending);
const recommended = events.slice(0, 6);

const Index = () => (
  <div className="container mx-auto space-y-12 py-6">
    <HeroBanner />
    <CategorySection />

    {/* Trending */}
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Trending Now 🔥</h2>
        <Link to="/events" className="text-sm text-primary hover:underline">View All</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trending.slice(0, 4).map((event, i) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
      </div>
    </section>

    {/* Recommended */}
    <section>
      <h2 className="mb-6 font-display text-2xl font-bold">Recommended for You</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommended.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
      </div>
    </section>
  </div>
);

export default Index;
