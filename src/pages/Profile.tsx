import { User, Ticket, Settings, LogOut } from 'lucide-react';

const mockBookings = [
  { id: 'EVT-A1B2C3', event: 'Arijit Singh Live', date: 'Apr 15, 2026', tickets: 2, total: 4198, status: 'Confirmed' },
  { id: 'EVT-D4E5F6', event: 'IPL 2026: MI vs CSK', date: 'Apr 20, 2026', tickets: 4, total: 3360, status: 'Confirmed' },
  { id: 'EVT-G7H8I9', event: 'Neon Nights EDM', date: 'Apr 12, 2026', tickets: 1, total: 2625, status: 'Completed' },
];

const Profile = () => (
  <div className="container mx-auto max-w-3xl py-6">
    <h1 className="mb-6 font-display text-3xl font-bold">My Profile</h1>

    <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">R</div>
      <div>
        <h2 className="font-display text-xl font-semibold">Rahul Sharma</h2>
        <p className="text-sm text-muted-foreground">rahul.sharma@email.com</p>
      </div>
    </div>

    <div className="mb-4 flex gap-2">
      {[{ icon: Ticket, label: 'Bookings' }, { icon: Settings, label: 'Settings' }].map(({ icon: Icon, label }) => (
        <button key={label} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary">
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>

    <div className="space-y-3">
      <h3 className="font-display text-lg font-semibold">Booking History</h3>
      {mockBookings.map((b) => (
        <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div>
            <p className="font-medium">{b.event}</p>
            <p className="text-xs text-muted-foreground">{b.id} · {b.date} · {b.tickets} tickets</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">₹{b.total}</p>
            <span className={`text-xs ${b.status === 'Confirmed' ? 'text-green-400' : 'text-muted-foreground'}`}>{b.status}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Profile;
