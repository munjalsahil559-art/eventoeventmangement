import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Calendar, MapPin, IndianRupee, Users, Star, ArrowLeft, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { categories, cities } from '@/data/events';
import { toast } from 'sonner';

interface DbEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  venue: string | null;
  city: string;
  date: string;
  time: string | null;
  price: number;
  capacity: number;
  tickets_sold: number;
  image_url: string | null;
  rating: number | null;
  is_featured: boolean | null;
}

const emptyForm = {
  title: '',
  description: '',
  category: 'movies',
  venue: '',
  city: 'Mumbai',
  date: '',
  time: '',
  price: 0,
  capacity: 100,
  image_url: '',
  is_featured: false,
};

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      toast.error('Admin access required');
    }
  }, [user, isAdmin, authLoading]);

  const fetchEvents = async () => {
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load events'); return; }
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchEvents(); }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category,
      venue: form.venue || null,
      city: form.city,
      date: form.date,
      time: form.time || null,
      price: form.price,
      capacity: form.capacity,
      image_url: form.image_url || null,
      is_featured: form.is_featured,
      created_by: user!.id,
    };

    if (editingId) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingId);
      if (error) { toast.error('Failed to update event'); return; }
      toast.success('Event updated!');
    } else {
      const { error } = await supabase.from('events').insert(payload);
      if (error) { toast.error('Failed to create event'); return; }
      toast.success('Event created!');
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchEvents();
  };

  const handleEdit = (event: DbEvent) => {
    setForm({
      title: event.title,
      description: event.description || '',
      category: event.category,
      venue: event.venue || '',
      city: event.city,
      date: event.date,
      time: event.time || '',
      price: event.price,
      capacity: event.capacity,
      image_url: event.image_url || '',
      is_featured: event.is_featured || false,
    });
    setEditingId(event.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { toast.error('Failed to delete event'); return; }
    toast.success('Event deleted');
    fetchEvents();
  };

  if (authLoading || loading) {
    return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const inputClass = "w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="container mx-auto py-6">
      <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 gradient-primary rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add Event
        </button>
      </div>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{editingId ? 'Edit Event' : 'Create Event'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputClass} placeholder="Event title" />
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} placeholder="Event description" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">City *</label>
                  <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass}>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Venue</label>
                <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={inputClass} placeholder="Venue name" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Time</label>
                  <input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputClass} placeholder="e.g. 7:00 PM" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Price (₹) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required min={0} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Capacity *</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required min={1} className={inputClass} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Image URL</label>
                <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inputClass} placeholder="https://..." />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded border-border" />
                Featured event
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-secondary">
                  Cancel
                </button>
                <button type="submit" className="flex-1 gradient-primary rounded-lg py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  {editingId ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Events Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {events.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-muted-foreground">No events yet. Create your first event!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Event</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">City</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Capacity</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {event.image_url && (
                          <img src={event.image_url} alt="" className="h-10 w-14 rounded object-cover hidden sm:block" />
                        )}
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{event.category} · {event.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize hidden md:table-cell">{event.category}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3">₹{event.price}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{event.city}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{event.tickets_sold}/{event.capacity}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(event)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
