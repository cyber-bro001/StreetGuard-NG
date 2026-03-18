import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertTriangle, FileText, Camera, Send, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateIssue } from '@/hooks/useIssues';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ReportMiniMap from '@/components/ReportMiniMap';

const ISSUE_TYPES = ['Pothole', 'Flooded Road', 'Broken Streetlight', 'Accident', 'Road Block'];
const SEVERITIES = [
  { value: 'severe', label: 'Critical', color: 'bg-destructive' },
  { value: 'moderate', label: 'Pending', color: 'bg-accent' },
  { value: 'minor', label: 'Minor', color: 'bg-primary' },
];

async function checkNearRoad(lat: number, lng: number): Promise<{ nearRoad: boolean; roadName?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
      { headers: { 'User-Agent': 'StreetGuardNG/1.0' } }
    );
    const data = await res.json();
    const road = data?.address?.road || data?.address?.highway || data?.address?.pedestrian;
    if (road) return { nearRoad: true, roadName: road };
    return { nearRoad: false };
  } catch {
    return { nearRoad: true };
  }
}

interface ReportDialogProps {
  onLocationChange?: (loc: { lat: number; lng: number } | null) => void;
  externalLocation?: { lat: number; lng: number } | null;
}

export default function ReportDialog({ onLocationChange, externalLocation }: ReportDialogProps) {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const createIssue = useCreateIssue();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [description, setDescription] = useState('');
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [roadWarning, setRoadWarning] = useState<string | null>(null);
  const [checkingRoad, setCheckingRoad] = useState(false);
  const [roadName, setRoadName] = useState<string | null>(null);

  useEffect(() => {
    if (externalLocation && open) {
      setLocation(externalLocation);
    }
  }, [externalLocation, open]);

  const detectAndCheckLocation = useCallback(async (lat: number, lng: number) => {
    setLocation({ lat, lng });
    onLocationChange?.({ lat, lng });
    setCheckingRoad(true);
    setRoadWarning(null);
    const result = await checkNearRoad(lat, lng);
    setCheckingRoad(false);
    if (!result.nearRoad) {
      setRoadWarning('This location does not appear to be directly on a road. Continue anyway?');
    } else if (result.roadName) {
      toast.success(`Location detected near ${result.roadName}`);
    } else {
      toast.success('Location detected near your position');
    }
  }, [onLocationChange]);

  const getLocation = useCallback(() => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        detectAndCheckLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        const fallback = { lat: 6.1956, lng: 6.7314 };
        setLocation(fallback);
        onLocationChange?.(fallback);
        setLocating(false);
        toast.info('Using default location (Asaba)');
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  }, [detectAndCheckLocation, onLocationChange]);

  useEffect(() => {
    if (open && !location) {
      getLocation();
    }
  }, [open]); // intentionally minimal deps

  const handleMarkerDrag = useCallback((lat: number, lng: number) => {
    detectAndCheckLocation(lat, lng);
  }, [detectAndCheckLocation]);

  const handleSubmit = () => {
    if (!type) { toast.error('Select an issue type'); return; }
    if (!location) { toast.error('Capture your location first'); return; }

    createIssue.mutate(
      { type, severity, description: description || undefined, latitude: location.lat, longitude: location.lng },
      {
        onSuccess: () => {
          toast.success('Issue reported! +10 points');
          setOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const resetForm = () => {
    setType('');
    setDescription('');
    setLocation(null);
    setRoadWarning(null);
    onLocationChange?.(null);
  };

  const handleOpen = (val: boolean) => {
    if (val && !user) {
      toast.error('Sign in to report issues');
      navigate('/auth');
      return;
    }
    if (!val) {
      resetForm();
    }
    setOpen(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 z-[1000] h-14 w-14 rounded-full shadow-xl"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto rounded-2xl border-border/50 bg-card/95 backdrop-blur-xl overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Report Issue
          </DialogTitle>
          <DialogDescription className="text-xs">
            Help improve infrastructure in your community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Issue Type */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <FileText className="h-3 w-3 text-muted-foreground" />
              Issue Type
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Severity</Label>
            <div className="flex gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all ${
                    severity === s.value
                      ? 'border-foreground/30 bg-secondary text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/20'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <FileText className="h-3 w-3 text-muted-foreground" />
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the issue..."
              maxLength={500}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Mini Map */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Navigation className="h-3 w-3 text-muted-foreground" />
              Location
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Drag the marker to the exact road location if needed
            </p>
            <div className="h-[200px] w-full overflow-hidden rounded-lg border border-border">
              {open && (
                <ReportMiniMap
                  location={location}
                  locating={locating}
                  onMarkerDrag={handleMarkerDrag}
                />
              )}
            </div>

            {!location && (
              <Button
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={getLocation}
                disabled={locating}
              >
                {locating ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Navigation className="mr-2 h-3 w-3" />}
                Capture Location
              </Button>
            )}

            {checkingRoad && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking road proximity…
              </p>
            )}

            {roadWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-accent/50 bg-accent/10 p-2 text-[11px] text-accent-foreground">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span>{roadWarning}</span>
              </div>
            )}

            {location && !roadWarning && !checkingRoad && (
              <p className="text-[11px] text-muted-foreground">
                📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            className="w-full h-9 text-sm"
            onClick={handleSubmit}
            disabled={createIssue.isPending}
          >
            {createIssue.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
