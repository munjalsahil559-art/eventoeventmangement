import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import MyTicketsQR from '@/components/booking/MyTicketsQR';

interface BookingRow {
  id: string;
  tickets: number;
  total_amount: number;
  status: string;
  created_at: string;
  events: { title: string; date: string } | null;
}

const Profile = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [profile, setProfile] = useState<{ display_name: string | null; city: string | null } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, city').eq('user_id', user.id).single().then(({ data }) => setProfile(data));
    supabase.from('bookings').select('id, tickets, total_amount, status, created_at, events(title, date)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setBookings((data as any) || []));
  }, [user]);

  if (authLoading || !user) return null;

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  return (
    <div className="container mx-auto max-w-3xl py-6">
      <h1 className="mb-6 font-display text-3xl font-bold">My Profile</h1>

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
          {(profile?.display_name || user.email || '?')[0].toUpperCase()}
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold">{profile?.display_name || 'User'}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary">
          <Ticket className="h-4 w-4" /> Bookings
        </button>
        <button onClick={handleSignOut} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary text-destructive">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Booking History</h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          bookings.map((b) => {
            const open = expandedId === b.id;
            return (
              <div key={b.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(open ? null : b.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{(b.events as any)?.title || 'Event'}</p>
                    <p className="text-xs text-muted-foreground">{b.id.slice(0, 8).toUpperCase()} · {new Date(b.created_at).toLocaleDateString()} · {b.tickets} ticket{b.tickets > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">₹{b.total_amount}</p>
                      <span className={`text-xs ${b.status === 'confirmed' ? 'text-green-400' : 'text-muted-foreground'}`}>{b.status}</span>
                    </div>
                    {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {open && (
                  <div className="border-t border-border p-4 bg-secondary/20">
                    <MyTicketsQR bookingId={b.id} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Profile;
