import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Film, Trophy, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TmdbMovie {
  tmdb_id: number;
  title: string;
  description: string;
  image_url: string | null;
  backdrop_url: string | null;
  date: string;
  rating: number;
  category: string;
}

interface SportEvent {
  title: string;
  description: string;
  date: string;
  venue: string;
  city: string;
  price: number;
  category: string;
  image_url: string;
  rating: number;
}

const ImportEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [loadingSports, setLoadingSports] = useState(false);
  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [sports, setSports] = useState<SportEvent[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set());
  const [selectedSports, setSelectedSports] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const fetchMovies = async () => {
    setLoadingMovies(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fetch-movies?type=movies`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      const data = await res.json();
      if (data.movies) {
        setMovies(data.movies);
        setSelectedMovies(new Set(data.movies.map((_: any, i: number) => i)));
      }
    } catch (err) {
      toast.error('Failed to fetch movies');
    }
    setLoadingMovies(false);
  };

  const fetchSports = async () => {
    setLoadingSports(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fetch-movies?type=sports`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      const data = await res.json();
      if (data.sports) {
        setSports(data.sports);
        setSelectedSports(new Set(data.sports.map((_: any, i: number) => i)));
      }
    } catch (err) {
      toast.error('Failed to fetch sports events');
    }
    setLoadingSports(false);
  };

  const importSelected = async () => {
    setImporting(true);
    let count = 0;

    // Import selected movies
    for (const idx of selectedMovies) {
      const m = movies[idx];
      if (!m) continue;
      const venues = ['PVR IMAX', 'INOX Megaplex', 'Cinepolis', 'PVR Gold'];
      const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'];
      const { error } = await supabase.from('events').insert({
        title: m.title,
        description: m.description,
        category: 'movies',
        image_url: m.image_url || m.backdrop_url,
        date: m.date || new Date().toISOString().split('T')[0],
        time: ['7:00 PM', '8:00 PM', '9:00 PM', '6:30 PM'][Math.floor(Math.random() * 4)],
        venue: venues[Math.floor(Math.random() * venues.length)],
        city: cities[Math.floor(Math.random() * cities.length)],
        price: [250, 300, 350, 400, 450][Math.floor(Math.random() * 5)],
        rating: m.rating ? Math.min(m.rating / 2, 5) : 4.0,
        capacity: 200,
        is_featured: m.rating > 7,
        created_by: user?.id,
      });
      if (!error) count++;
    }

    // Import selected sports
    for (const idx of selectedSports) {
      const s = sports[idx];
      if (!s) continue;
      const { error } = await supabase.from('events').insert({
        title: s.title,
        description: s.description,
        category: 'sports',
        image_url: s.image_url,
        date: s.date,
        venue: s.venue,
        city: s.city,
        price: s.price,
        rating: s.rating,
        capacity: 30000,
        is_featured: true,
        created_by: user?.id,
      });
      if (!error) count++;
    }

    toast.success(`Imported ${count} events successfully!`);
    setImporting(false);
  };

  const toggleMovie = (idx: number) => {
    const next = new Set(selectedMovies);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelectedMovies(next);
  };

  const toggleSport = (idx: number) => {
    const next = new Set(selectedSports);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setSelectedSports(next);
  };

  return (
    <div className="container mx-auto max-w-4xl py-6">
      <button onClick={() => navigate('/admin')} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </button>

      <h1 className="mb-2 font-display text-3xl font-bold">Import Events</h1>
      <p className="mb-6 text-muted-foreground">Fetch latest movies from TMDB and sports events to add to your platform.</p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Movies Section */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Film className="h-5 w-5 text-primary" /> Latest Movies
            </h2>
            <button
              onClick={fetchMovies}
              disabled={loadingMovies}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loadingMovies ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Fetch Movies'}
            </button>
          </div>

          {movies.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {movies.map((m, i) => (
                <label key={i} className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors ${selectedMovies.has(i) ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 border border-transparent'}`}>
                  <input type="checkbox" checked={selectedMovies.has(i)} onChange={() => toggleMovie(i)} className="rounded" />
                  {m.image_url && <img src={m.image_url} alt={m.title} className="h-12 w-9 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground">{m.date} • ⭐ {m.rating}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Sports Section */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Trophy className="h-5 w-5 text-primary" /> Sports Events
            </h2>
            <button
              onClick={fetchSports}
              disabled={loadingSports}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loadingSports ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Fetch Sports'}
            </button>
          </div>

          {sports.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sports.map((s, i) => (
                <label key={i} className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors ${selectedSports.has(i) ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 border border-transparent'}`}>
                  <input type="checkbox" checked={selectedSports.has(i)} onChange={() => toggleSport(i)} className="rounded" />
                  <img src={s.image_url} alt={s.title} className="h-12 w-12 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{s.date} • {s.venue}, {s.city}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {(movies.length > 0 || sports.length > 0) && (
        <button
          onClick={importSelected}
          disabled={importing || (selectedMovies.size === 0 && selectedSports.size === 0)}
          className="mt-6 w-full gradient-primary rounded-lg py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {importing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
          ) : (
            <><CheckCircle className="h-4 w-4" /> Import {selectedMovies.size + selectedSports.size} Selected Events</>
          )}
        </button>
      )}
    </div>
  );
};

export default ImportEvents;
