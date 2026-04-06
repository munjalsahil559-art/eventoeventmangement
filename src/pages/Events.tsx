import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { events, categories, cities, type EventCategory } from '@/data/events';

type SortOption = 'popular' | 'latest' | 'price-low' | 'price-high';

const Events = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') as EventCategory | null;
  const searchQuery = searchParams.get('search') || '';

  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>(initialCategory || 'all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...events];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q)));
    }
    if (selectedCategory !== 'all') result = result.filter((e) => e.category === selectedCategory);
    if (selectedCity !== 'all') result = result.filter((e) => e.city === selectedCity);

    switch (sortBy) {
      case 'popular': result.sort((a, b) => b.reviews - a.reviews); break;
      case 'latest': result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break;
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
    }

    return result;
  }, [selectedCategory, selectedCity, sortBy, searchQuery]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">
          {searchQuery ? `Results for "${searchQuery}"` : 'Explore Events'}
        </h1>
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary md:hidden">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className={`${showFilters ? 'block' : 'hidden'} w-full flex-shrink-0 md:block md:w-56`}>
          <div className="space-y-6 rounded-xl border border-border bg-card p-4">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Category</h3>
              <div className="space-y-1">
                <button onClick={() => setSelectedCategory('all')} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>All</button>
                {categories.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCategory(c.id as EventCategory)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedCategory === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">City</h3>
              <div className="space-y-1">
                <button onClick={() => setSelectedCity('all')} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedCity === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>All Cities</button>
                {cities.map((c) => (
                  <button key={c} onClick={() => setSelectedCity(c)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedCity === c ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Sort By</h3>
              <div className="space-y-1">
                {([['popular', 'Most Popular'], ['latest', 'Upcoming'], ['price-low', 'Price: Low to High'], ['price-high', 'Price: High to Low']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${sortBy === val ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Events Grid */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
              <p className="text-muted-foreground">No events found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;
