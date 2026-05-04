import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EventCard {
  id: string;
  title: string;
  category: string;
  city: string;
  date: string;
  price: number;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  events?: EventCard[];
}

const SUGGESTIONS = [
  'Comedy shows in Mumbai this weekend',
  'Cheap concerts under ₹500',
  'Romantic date-night events',
  'Sports events near me',
];

const EventChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: "Hey! 👋 I'm your event guide. Tell me a category, city, mood or budget — I'll find the perfect plan." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('event-chat', {
        body: { messages: next.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, events: data.events || [] }]);
    } catch (e: any) {
      toast.error(e.message || 'Chatbot error');
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Sorry, I had trouble responding. Try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-glow"
        aria-label="Open event assistant"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-glow sm:w-96"
            style={{ height: 'min(36rem, calc(100vh - 8rem))' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary/20 to-accent/20 p-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-display text-sm font-semibold">Evento Assistant</p>
                <p className="text-[10px] text-muted-foreground">Your AI event guide</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] space-y-2 ${m.role === 'user' ? '' : 'w-full'}`}>
                    <div className={`rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'gradient-primary text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-foreground rounded-bl-sm'
                    }`}>
                      {m.content}
                    </div>
                    {m.events && m.events.length > 0 && (
                      <div className="space-y-1.5">
                        {m.events.map(ev => (
                          <Link
                            key={ev.id}
                            to={`/event/${ev.id}`}
                            onClick={() => setOpen(false)}
                            className="block rounded-lg border border-border bg-background/60 p-2.5 transition-colors hover:border-primary/50 hover:bg-secondary"
                          >
                            <p className="line-clamp-1 text-xs font-semibold">{ev.title}</p>
                            <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{ev.category} · {ev.city}</span>
                              <span className="font-semibold text-primary">₹{ev.price}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(ev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Thinking...
                </div>
              )}
              {messages.length <= 1 && !loading && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Try asking</p>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-lg border border-border bg-background/40 px-3 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-secondary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex gap-2 border-t border-border p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about events..."
                className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="gradient-primary flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EventChatbot;