import { useLeaderboard } from '@/hooks/useIssues';
import { Trophy, Medal, Star } from 'lucide-react';

export default function Leaderboard() {
  const { data: leaders = [], isLoading } = useLeaderboard();

  const rankIcons = [
    <Trophy className="h-5 w-5 text-accent" />,
    <Medal className="h-5 w-5 text-muted-foreground" />,
    <Star className="h-5 w-5 text-amber-700" />,
  ];

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pt-20 pb-10">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Top Contributors</h1>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : leaders.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">No contributors yet. Be the first to report an issue!</p>
      ) : (
        <div className="space-y-2">
          {leaders.map((user, i) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 rounded-lg border border-border p-4 transition-colors ${
                i < 3 ? 'bg-card' : 'bg-background'
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center">
                {i < 3 ? rankIcons[i] : <span className="text-sm text-muted-foreground">{i + 1}</span>}
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.reports_count} reports</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">{user.points}</div>
                <div className="text-xs text-muted-foreground">pts</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
