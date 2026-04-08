import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowLeft, X, BarChart3, Ticket, Users, IndianRupee, TrendingUp, Armchair, Wallet, Building2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { categories, cities } from '@/data/events';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  created_by: string | null;
}

interface VenueSection {
  id: string;
  event_id: string;
  section_name: string;
  price: number;
  total_seats: number;
  available_seats: number;
}

interface BookingRow {
  id: string;
  tickets: number;
  total_amount: number;
  status: string;
  created_at: string;
  event_id: string;
}

interface PaymentRow {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  card_last_four: string | null;
  card_holder_name: string | null;
  upi_id: string | null;
  transaction_ref: string | null;
  status: string;
  created_at: string;
}

interface PaymentAccount {
  id: string;
  admin_id: string;
  account_holder_name: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  is_primary: boolean | null;
}

const emptyForm = {
  title: '', description: '', category: 'movies', venue: '', city: 'Mumbai',
  date: '', time: '', price: 0, capacity: 100, image_url: '', is_featured: false,
};

const emptySectionForm = { section_name: '', price: 0, total_seats: 100 };

const emptyAccountForm = {
  account_holder_name: '', bank_name: '', account_number: '', ifsc_code: '', upi_id: '', is_primary: false,
};

const CHART_COLORS = ['hsl(0, 85%, 55%)', 'hsl(15, 90%, 55%)', 'hsl(280, 70%, 55%)', 'hsl(150, 60%, 45%)', 'hsl(210, 70%, 55%)'];

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'analytics' | 'events' | 'sections'>('analytics');
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [sections, setSections] = useState<VenueSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm] = useState(emptySectionForm);
  const [sectionEventId, setSectionEventId] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
      toast.error('Admin access required');
    }
  }, [user, isAdmin, authLoading]);

  const fetchAll = async () => {
    const [evRes, bkRes, secRes] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('venue_sections').select('*'),
    ]);
    setEvents(evRes.data || []);
    setBookings(bkRes.data || []);
    setSections(secRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  // Filter to only show admin's own events
  const myEvents = events.filter(e => e.created_by === user?.id);
  const myEventIds = new Set(myEvents.map(e => e.id));
  const myBookings = bookings.filter(b => myEventIds.has(b.event_id));

  const totalRevenue = myBookings.reduce((s, b) => s + b.total_amount, 0);
  const totalTickets = myBookings.reduce((s, b) => s + b.tickets, 0);

  const categoryData = categories.map(c => ({
    name: c.label,
    events: myEvents.filter(e => e.category === c.id).length,
  })).filter(c => c.events > 0);

  const revenueByEvent = myEvents.map(e => ({
    name: e.title.length > 15 ? e.title.slice(0, 15) + '…' : e.title,
    revenue: myBookings.filter(b => b.event_id === e.id).reduce((s, b) => s + b.total_amount, 0),
  })).filter(e => e.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  // Event CRUD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title, description: form.description || null, category: form.category,
      venue: form.venue || null, city: form.city, date: form.date, time: form.time || null,
      price: form.price, capacity: form.capacity, image_url: form.image_url || null,
      is_featured: form.is_featured, created_by: user!.id,
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
    setShowForm(false); setEditingId(null); setForm(emptyForm); fetchAll();
  };

  const handleEdit = (event: DbEvent) => {
    setForm({ title: event.title, description: event.description || '', category: event.category, venue: event.venue || '', city: event.city, date: event.date, time: event.time || '', price: event.price, capacity: event.capacity, image_url: event.image_url || '', is_featured: event.is_featured || false });
    setEditingId(event.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Event deleted'); fetchAll();
  };

  // Section CRUD
  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('venue_sections').insert({
      event_id: sectionEventId,
      section_name: sectionForm.section_name,
      price: sectionForm.price,
      total_seats: sectionForm.total_seats,
      available_seats: sectionForm.total_seats,
    });
    if (error) { toast.error('Failed to add section'); return; }
    toast.success('Section added!');
    setShowSectionForm(false); setSectionForm(emptySectionForm); fetchAll();
  };

  const handleDeleteSection = async (id: string) => {
    const { error } = await supabase.from('venue_sections').delete().eq('id', id);
    if (error) { toast.error('Failed to delete section'); return; }
    toast.success('Section deleted'); fetchAll();
  };

  if (authLoading || loading) return <div className="container mx-auto flex h-[60vh] items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  const inputClass = "w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="container mx-auto py-6">
      <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to home
      </button>

      <h1 className="mb-6 font-display text-3xl font-bold">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border pb-2">
        {[
          { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
          { id: 'events' as const, label: 'My Events', icon: Ticket },
          { id: 'sections' as const, label: 'Venue Sections', icon: Armchair },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'My Events', value: myEvents.length, icon: Ticket, color: 'text-primary' },
              { label: 'Total Bookings', value: myBookings.length, icon: Users, color: 'text-accent' },
              { label: 'Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'text-green-400' },
              { label: 'Tickets Sold', value: totalTickets, icon: TrendingUp, color: 'text-blue-400' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 font-display font-semibold">Revenue by Event</h3>
              {revenueByEvent.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueByEvent}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(0 0% 55%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(0 0% 55%)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 20%)', borderRadius: '8px' }} />
                    <Bar dataKey="revenue" fill="hsl(0, 85%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 font-display font-semibold">Events by Category</h3>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" outerRadius={90} dataKey="events" label={({ name, events }) => `${name}: ${events}`}>
                      {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 20%)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">No events yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className="flex items-center gap-2 gradient-primary rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Event
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {myEvents.length === 0 ? (
              <div className="flex h-48 items-center justify-center"><p className="text-muted-foreground">No events yet. Create your first event!</p></div>
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
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Sold/Cap</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myEvents.map((event) => (
                      <tr key={event.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {event.image_url && <img src={event.image_url} alt="" className="h-10 w-14 rounded object-cover hidden sm:block" />}
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
                            <button onClick={() => handleEdit(event)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(event.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Venue Sections Tab */}
      {tab === 'sections' && (
        <>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowSectionForm(true)} className="flex items-center gap-2 gradient-primary rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Section
            </button>
          </div>

          {myEvents.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center"><p className="text-muted-foreground">Create events first to add venue sections.</p></div>
          ) : (
            <div className="space-y-4">
              {myEvents.map(ev => {
                const evSections = sections.filter(s => s.event_id === ev.id);
                if (evSections.length === 0) return null;
                return (
                  <div key={ev.id} className="rounded-xl border border-border bg-card p-5">
                    <h3 className="mb-3 font-display font-semibold">{ev.title}</h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {evSections.map(sec => (
                        <div key={sec.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary p-3">
                          <div>
                            <p className="font-medium">{sec.section_name}</p>
                            <p className="text-xs text-muted-foreground">₹{sec.price} · {sec.available_seats}/{sec.total_seats} seats</p>
                          </div>
                          <button onClick={() => handleDeleteSection(sec.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {sections.filter(s => myEventIds.has(s.event_id)).length === 0 && (
                <div className="rounded-xl border border-border bg-card p-12 text-center"><p className="text-muted-foreground">No venue sections yet. Add sections like VIP, Gold, Silver to your events.</p></div>
              )}
            </div>
          )}

          {/* Section Form Modal */}
          {showSectionForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">Add Venue Section</h2>
                  <button onClick={() => setShowSectionForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>
                <form onSubmit={handleSectionSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Event *</label>
                    <select value={sectionEventId} onChange={e => setSectionEventId(e.target.value)} required className={inputClass}>
                      <option value="">Select event</option>
                      {myEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-muted-foreground">Section Name *</label>
                    <input value={sectionForm.section_name} onChange={e => setSectionForm({ ...sectionForm, section_name: e.target.value })} required className={inputClass} placeholder="e.g. VIP, Gold, Silver" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">Price (₹) *</label>
                      <input type="number" value={sectionForm.price} onChange={e => setSectionForm({ ...sectionForm, price: Number(e.target.value) })} required min={0} className={inputClass} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-muted-foreground">Total Seats *</label>
                      <input type="number" value={sectionForm.total_seats} onChange={e => setSectionForm({ ...sectionForm, total_seats: Number(e.target.value) })} required min={1} className={inputClass} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowSectionForm(false)} className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-secondary">Cancel</button>
                    <button type="submit" className="flex-1 gradient-primary rounded-lg py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Add Section</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{editingId ? 'Edit Event' : 'Create Event'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className={inputClass} placeholder="Event title" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} placeholder="Event description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Category *</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">City *</label>
                  <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className={inputClass}>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Venue</label>
                <input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} className={inputClass} placeholder="Venue name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Time</label>
                  <input value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className={inputClass} placeholder="e.g. 7:00 PM" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Price (₹) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required min={0} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Capacity *</label>
                  <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })} required min={1} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Image URL</label>
                <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className={inputClass} placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} className="rounded border-border" />
                Featured event
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-secondary">Cancel</button>
                <button type="submit" className="flex-1 gradient-primary rounded-lg py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">{editingId ? 'Update Event' : 'Create Event'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Admin;
