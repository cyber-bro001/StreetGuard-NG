import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useIssues, useVerifyIssue, type Issue } from '@/hooks/useIssues';
import { useAuthContext } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Calendar, User, Activity, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import ReportDialog from '@/components/ReportDialog';
import NearbyIssuesAlert from '@/components/NearbyIssuesAlert';

function MapFlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 15, { duration: 1 });
  }, [target, map]);
  return null;
}

const DELTA_STATE_CENTER: [number, number] = [6.1956, 6.7314];

const severityColors = {
  severe: '#ef4444',
  moderate: '#f59e0b',
  minor: '#22c55e',
};

function createIcon(severity: string) {
  const color = severityColors[severity as keyof typeof severityColors] || '#f59e0b';
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:${color};border:2.5px solid rgba(255,255,255,0.9);border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const draggableIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.6);animation:pulse 1.5s infinite;"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function getPositionKey(issue: Pick<Issue, 'latitude' | 'longitude'>) {
  return `${issue.latitude.toFixed(6)}:${issue.longitude.toFixed(6)}`;
}

function offsetDuplicateMarker(issue: Issue, duplicateIndex: number, duplicateCount: number): [number, number] {
  if (duplicateCount <= 1) {
    return [issue.latitude, issue.longitude];
  }

  const angle = (duplicateIndex / duplicateCount) * Math.PI * 2;
  const latOffset = 0.00012 * Math.sin(angle);
  const lngOffset = (0.00012 * Math.cos(angle)) / Math.max(Math.cos((issue.latitude * Math.PI) / 180), 0.3);

  return [issue.latitude + latOffset, issue.longitude + lngOffset];
}

function InfraScore({ issues }: { issues: Issue[] }) {
  const score = Math.max(0, Math.min(10, 10 - (issues.length / 5)));
  const color = score >= 7 ? 'text-primary' : score >= 4 ? 'text-accent' : 'text-destructive';
  return (
    <div className="absolute top-[72px] right-4 z-[1000] rounded-xl border border-border/50 bg-card/70 px-3 py-2 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Infra Score</span>
      </div>
      <div className={`mt-0.5 text-xl font-bold leading-tight ${color}`}>
        {score.toFixed(1)}
        <span className="text-xs font-normal text-muted-foreground">/10</span>
      </div>
    </div>
  );
}

function MapLegend() {
  const items = [
    { label: 'Critical', color: severityColors.severe },
    { label: 'Pending', color: severityColors.moderate },
    { label: 'Fixed', color: severityColors.minor },
  ];
  return (
    <div className="absolute bottom-6 left-4 z-[1000] flex gap-3 rounded-xl border border-border/50 bg-card/70 px-3 py-2 text-xs shadow-lg backdrop-blur-md">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

const roadNameCache = new Map<string, string>();

async function fetchRoadName(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
  if (roadNameCache.has(key)) return roadNameCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
      { headers: { 'User-Agent': 'StreetGuardNG/1.0' } }
    );
    const data = await res.json();
    const road = data?.address?.road || data?.address?.highway || data?.address?.pedestrian || 'Unnamed Road';
    roadNameCache.set(key, road);
    return road;
  } catch {
    return 'Unnamed Road';
  }
}

function IssuePopup({ issue }: { issue: Issue }) {
  const { user } = useAuthContext();
  const verify = useVerifyIssue();
  const [roadName, setRoadName] = useState<string | null>(null);

  useEffect(() => {
    fetchRoadName(issue.latitude, issue.longitude).then(setRoadName);
  }, [issue.latitude, issue.longitude]);

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
    <div className="min-w-[200px] space-y-2 p-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-foreground text-sm">{issue.type}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityBg[issue.severity]}`}>
          {severityLabel[issue.severity]}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span>{roadName ?? 'Loading…'}</span>
      </div>
      {issue.description && <p className="text-xs text-muted-foreground leading-relaxed">{issue.description}</p>}
      {issue.image_url && (
        <img src={issue.image_url} alt={issue.type} className="h-24 w-full rounded-md object-cover" loading="lazy" />
      )}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{issue.verified_count} verified</span>
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(issue.created_at).toLocaleDateString()}</span>
      </div>
      {issue.profiles?.name && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="h-3 w-3" />{issue.profiles.name}
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs h-7"
        onClick={handleVerify}
        disabled={verify.isPending}
      >
        <AlertTriangle className="h-3 w-3" />
        Confirm Issue
      </Button>
    </div>
  );
}

function DraggableMarker({
  position,
  onDragEnd,
}: {
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}) {
  return (
    <Marker
      position={position}
      icon={draggableIcon}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onDragEnd(pos.lat, pos.lng);
        },
      }}
    />
  );
}

export default function MapDashboard() {
  const { data: issues = [], isLoading } = useIssues();
  const [reportLocation, setReportLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleFocusNearby = useCallback((lat: number, lng: number) => {
    setFlyTarget({ lat, lng });
  }, []);

  const handleLocationChange = useCallback((loc: { lat: number; lng: number } | null) => {
    setReportLocation(loc);
  }, []);

  const handleDragEnd = useCallback((lat: number, lng: number) => {
    setReportLocation({ lat, lng });
  }, []);

  const markers = useMemo(() => {
    const duplicateCounts = new Map<string, number>();
    const duplicateIndices = new Map<string, number>();

    for (const issue of issues) {
      const key = getPositionKey(issue);
      duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
    }

    return issues.map((issue) => {
      const key = getPositionKey(issue);
      const duplicateIndex = duplicateIndices.get(key) ?? 0;
      duplicateIndices.set(key, duplicateIndex + 1);

      return {
        ...issue,
        icon: createIcon(issue.severity),
        position: offsetDuplicateMarker(issue, duplicateIndex, duplicateCounts.get(key) ?? 1),
      };
    });
  }, [issues]);

  useEffect(() => {
    console.debug('[MapDashboard] rendering reports', {
      fetchedReports: issues.length,
      renderedMarkers: markers.length,
      duplicateCoordinateGroups: new Set(issues.map(getPositionKey)).size,
    });
  }, [issues, markers]);

  return (
    <div className="relative h-screen pt-14">
      <InfraScore issues={issues} />
      <NearbyIssuesAlert issues={issues} onFocusNearby={handleFocusNearby} />
      <ReportDialog
        onLocationChange={handleLocationChange}
        externalLocation={reportLocation}
      />
      <MapLegend />

      {isLoading && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-background pt-14">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <MapContainer
        center={DELTA_STATE_CENTER}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map((marker) => (
          <Marker key={marker.id} position={marker.position} icon={marker.icon}>
            <Popup>
              <IssuePopup issue={marker} />
            </Popup>
          </Marker>
        ))}
        {reportLocation && (
          <DraggableMarker
            position={[reportLocation.lat, reportLocation.lng]}
            onDragEnd={handleDragEnd}
          />
        )}
        <MapFlyTo target={flyTarget} />
      </MapContainer>
    </div>
  );
}
