import { useState, useEffect, useMemo } from 'react';
import { X, Navigation, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import type { Issue } from '@/hooks/useIssues';

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const severityStyle: Record<string, string> = {
  severe: 'text-destructive font-semibold',
  moderate: 'text-accent font-semibold',
  minor: 'text-primary font-semibold',
};

const severityLabel: Record<string, string> = {
  severe: 'Critical',
  moderate: 'Moderate',
  minor: 'Minor',
};

interface Props {
  issues: Issue[];
  onFocusNearby?: (lat: number, lng: number) => void;
}

export default function NearbyIssuesAlert({ issues, onFocusNearby }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const nearby = useMemo(() => {
    if (!userPos) return [];
    return issues
      .map((issue) => ({
        issue,
        distance: haversineDistance(userPos.lat, userPos.lng, issue.latitude, issue.longitude),
      }))
      .filter((r) => r.distance <= 500)
      .sort((a, b) => a.distance - b.distance);
  }, [userPos, issues]);

  if (dismissed) return null;

  return (
    <div className="absolute top-[72px] left-1/2 z-[1000] w-[90%] max-w-md -translate-x-1/2 pointer-events-auto">
      <Card className="border-border/60 bg-card/80 shadow-lg backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-accent" />
            Nearby Issues {nearby.length > 0 && `(${nearby.length})`}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="px-4 pb-2 pt-0">
          {!userPos ? (
            <p className="text-xs text-muted-foreground">Detecting your location…</p>
          ) : nearby.length === 0 ? (
            <p className="text-xs text-muted-foreground">No nearby issues detected</p>
          ) : (
            <ul className="space-y-1">
              {nearby.slice(0, 3).map(({ issue, distance }) => (
                <li key={issue.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">
                    • {issue.type} –{' '}
                    <span className={severityStyle[issue.severity] ?? ''}>
                      {severityLabel[issue.severity] ?? issue.severity}
                    </span>
                  </span>
                  <span className="text-muted-foreground">{Math.round(distance)}m</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>

        {nearby.length > 0 && onFocusNearby && userPos && (
          <CardFooter className="px-4 pb-3 pt-0">
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              onClick={() => onFocusNearby(userPos.lat, userPos.lng)}
            >
              <Navigation className="h-3 w-3" />
              View on Map
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
