import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useIssues, useVerifyIssue, type Issue } from '@/hooks/useIssues';
import { useAuthContext } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import ReportDialog from '@/components/ReportDialog';

const DELTA_STATE_CENTER: [number, number] = [5.8904, 5.6804];

const severityColors = {
  severe: '#ef4444',
  moderate: '#f59e0b',
  minor: '#22c55e',
};

function createIcon(severity: string) {
  const color = severityColors[severity as keyof typeof severityColors] || '#f59e0b';
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid rgba(255,255,255,0.9);border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function InfraScore({ issues }: { issues: Issue[] }) {
  const score = Math.max(0, Math.min(10, 10 - (issues.length / 5)));
  const color = score >= 7 ? 'text-primary' : score >= 4 ? 'text-accent' : 'text-destructive';
  return (
    <div className="absolute top-4 right-4 z-[1000] rounded-lg border border-border bg-card/90 p-3 backdrop-blur-sm">
      <div className="text-xs text-muted-foreground">Infrastructure Score</div>
      <div className={`text-2xl font-bold ${color}`}>{score.toFixed(1)}<span className="text-sm text-muted-foreground">/10</span></div>
    </div>
  );
}

function IssuePopup({ issue }: { issue: Issue }) {
  const { user } = useAuthContext();
  const verify = useVerifyIssue();

  const handleVerify = () => {
    if (!user) {
      toast.error('Sign in to verify issues');
      return;
    }
    verify.mutate(issue.id, {
      onSuccess: () => toast.success('Issue verified!'),
      onError: (e) => toast.error(e.message),
    });
  };

  const severityLabel = { severe: 'Severe', moderate: 'Moderate', minor: 'Minor' };
  const severityBg = {
    severe: 'bg-destructive/20 text-destructive',
    moderate: 'bg-accent/20 text-accent',
    minor: 'bg-primary/20 text-primary',
  };

  return (
    <div className="min-w-[220px] space-y-2 p-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground">{issue.type}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBg[issue.severity]}`}>
          {severityLabel[issue.severity]}
        </span>
      </div>
      {issue.description && <p className="text-xs text-muted-foreground">{issue.description}</p>}
      {issue.image_url && (
        <img src={issue.image_url} alt={issue.type} className="h-28 w-full rounded-md object-cover" loading="lazy" />
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{issue.verified_count} verified</span>
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(issue.created_at).toLocaleDateString()}</span>
      </div>
      {issue.profiles?.name && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />{issue.profiles.name}
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={handleVerify}
        disabled={verify.isPending}
      >
        <AlertTriangle className="h-3 w-3" />
        Confirm Issue
      </Button>
    </div>
  );
}

export default function MapDashboard() {
  const { data: issues = [], isLoading } = useIssues();

  const markers = useMemo(
    () => issues.map((issue) => ({
      ...issue,
      icon: createIcon(issue.severity),
      position: [issue.latitude, issue.longitude] as [number, number],
    })),
    [issues]
  );

  return (
    <div className="relative h-screen pt-14">
      <InfraScore issues={issues} />
      <ReportDialog />

      {isLoading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background pt-14">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <MapContainer
        center={LAGOS_CENTER}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map((m) => (
          <Marker key={m.id} position={m.position} icon={m.icon}>
            <Popup>
              <IssuePopup issue={m} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] flex gap-3 rounded-lg border border-border bg-card/90 px-3 py-2 text-xs backdrop-blur-sm">
        {Object.entries(severityColors).map(([key, color]) => (
          <span key={key} className="flex items-center gap-1.5 capitalize text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}
