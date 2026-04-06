import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, User, Heart, Menu, X, Shield, LogOut } from 'lucide-react';
import { cities } from '@/data/events';
import { useAuth } from '@/hooks/useAuth';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between gap-4 py-3">
        <Link to="/" className="flex-shrink-0">
          <h1 className="font-display text-2xl font-bold text-gradient">Evento</h1>
        </Link>

        <div className="relative hidden md:block">
          <button
            onClick={() => setShowCityDropdown(!showCityDropdown)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <MapPin className="h-4 w-4 text-primary" />
            {selectedCity}
          </button>
          {showCityDropdown && (
            <div className="absolute left-0 top-full mt-1 w-40 rounded-lg border border-border bg-card p-1 shadow-card">
              {cities.map((city) => (
                <button key={city} onClick={() => { setSelectedCity(city); setShowCityDropdown(false); }} className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary">
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="hidden flex-1 md:block md:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search events, movies, concerts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </form>

        <div className="hidden items-center gap-2 md:flex">
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-accent transition-colors hover:bg-secondary">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
          <Link to="/wishlist" className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground">
            <Heart className="h-5 w-5" />
          </Link>
          {user ? (
            <>
              <Link to="/profile" className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground">
                <User className="h-5 w-5" />
              </Link>
              <button onClick={handleSignOut} className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground">
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Link to="/auth" className="gradient-primary rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Sign In
            </Link>
          )}
          <Link to="/events" className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary">
            Explore
          </Link>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-foreground">
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-border bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            </div>
          </form>
          <div className="flex flex-col gap-2">
            <Link to="/events" className="rounded-lg px-3 py-2 text-sm hover:bg-secondary" onClick={() => setMobileMenuOpen(false)}>Explore Events</Link>
            {isAdmin && <Link to="/admin" className="rounded-lg px-3 py-2 text-sm text-accent hover:bg-secondary" onClick={() => setMobileMenuOpen(false)}>Admin Panel</Link>}
            <Link to="/wishlist" className="rounded-lg px-3 py-2 text-sm hover:bg-secondary" onClick={() => setMobileMenuOpen(false)}>Wishlist</Link>
            {user ? (
              <>
                <Link to="/profile" className="rounded-lg px-3 py-2 text-sm hover:bg-secondary" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary">Sign Out</button>
              </>
            ) : (
              <Link to="/auth" className="rounded-lg px-3 py-2 text-sm text-primary hover:bg-secondary" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
