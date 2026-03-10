import { Link, useLocation } from 'react-router-dom';
import { MapPin, Trophy, LogIn, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/AuthProvider';

export default function Navbar() {
  const { user, signOut } = useAuthContext();
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-foreground">
          <Shield className="h-5 w-5 text-primary" />
          <span>StreetGuard<span className="text-primary"> NG</span></span>
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/">
            <Button variant={location.pathname === '/' ? 'secondary' : 'ghost'} size="sm">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant={location.pathname === '/leaderboard' ? 'secondary' : 'ghost'} size="sm">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Button>
          </Link>
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
