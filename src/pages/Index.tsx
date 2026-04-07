import { useEffect, useState } from 'react';
import HeroBanner from '@/components/HeroBanner';
import CategorySection from '@/components/CategorySection';
import EventCard from '@/components/EventCard';
import type { DbEvent } from '@/components/EventCard';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      setEvents(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const featured = events.filter((e) => e.is_featured);
  const recent = events.slice(0, 6);

  return (
    <div className="container mx-auto space-y-12 py-6">
      <HeroBanner />
      <CategorySection />

      {loading ? (
        <p className="text-center text-muted-foreground">Loading events...</p>
      ) : events.length === 0 ? (
        <p className="text-center text-muted-foreground">No events yet. Admins can add events from the admin panel.</p>
      ) : (
        <>
          {featured.length > 0 && (
            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">Featured Events 🔥</h2>
                <Link to="/events" className="text-sm text-primary hover:underline">View All</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {featured.slice(0, 4).map((event, i) => (
                  <EventCard key={event.id} event={event} index={i} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-6 font-display text-2xl font-bold">Recent Events</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Index;
