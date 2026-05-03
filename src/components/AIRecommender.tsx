import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import EventCard, { type DbEvent } from './EventCard';

const MOODS = [
  { emoji: '😄', label: 'Happy & Upbeat' },
  { emoji: '😌', label: 'Chill & Relaxed' },
  { emoji: '🥰', label: 'Romantic Date Night' },
  { emoji: '⚡', label: 'High Energy' },
  { emoji: '🎭', label: 'Cultural & Artsy' },
  { emoji: '🤣', label: 'Need a Laugh' },
  { emoji: '🏆', label: 'Sports Thrill' },
  { emoji: '🧠', label: 'Mind-bending' },
];

interface Recommendation extends DbEvent {
  reason: string;
}

const AIRecommender = () => {
  const { user } = useAuth();
  const [mood, setMood] = useState<string>('');
  const [customMood, setCustomMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [vibe, setVibe] = useState<string>('');
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoLoadedForUser, setAutoLoadedForUser] = useState(false);

  const fetchRecs = async (selectedMood: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('ai-recommend', {
        body: { mood: selectedMood, userId: user?.id },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setVibe(data.vibe_message || '');
      setRecs(data.recommendations || []);
    } catch (e: any) {
      setError(e.message || 'Could not fetch AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Personalised auto-load for signed-in users (one-time)
  useEffect(() => {
    if (user && !autoLoadedForUser) {
      setAutoLoadedForUser(true);
      fetchRecs('personalised based on my history');
    }
  }, [user]);

  const handleMood = (label: string) => { setMood(label); fetchRecs(label); };
  const handleCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customMood.trim()) { setMood(customMood); fetchRecs(customMood); }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">AI Curator</span>
          </div>
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            {user ? 'Picked just for you' : 'How are you feeling tonight?'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {user ? 'Personalised events & movies based on your mood and bookings.' : 'Tell us your vibe — we’ll match the perfect event.'}
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.label}
            onClick={() => handleMood(m.label)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
              mood === m.label
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-secondary/50 hover:border-primary/50 hover:bg-secondary'
            }`}
          >
            <span className="mr-1">{m.emoji}</span>{m.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleCustom} className="mb-6 flex gap-2">
        <input
          value={customMood}
          onChange={(e) => setCustomMood(e.target.value)}
          placeholder="Or describe your mood... e.g. 'I want a quiet jazz night'"
          className="flex-1 rounded-lg border border-border bg-background/60 px-4 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !customMood.trim()}
          className="gradient-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Wand2 className="h-4 w-4" /> Curate
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Curating recommendations...</span>
        </div>
      )}

      {error && !loading && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <AnimatePresence>
        {!loading && vibe && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-primary/20 bg-background/40 p-3 text-sm italic text-foreground"
          >
            ✨ {vibe}
          </motion.p>
        )}
      </AnimatePresence>

      {!loading && recs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recs.map((rec, i) => (
            <div key={rec.id} className="space-y-2">
              <EventCard event={rec} index={i} />
              <p className="px-1 text-xs text-muted-foreground italic">💡 {rec.reason}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default AIRecommender;