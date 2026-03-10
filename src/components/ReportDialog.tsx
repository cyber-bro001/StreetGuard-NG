import { useState } from 'react';
import { Plus, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateIssue } from '@/hooks/useIssues';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ISSUE_TYPES = ['Pothole', 'Flooded Road', 'Broken Streetlight', 'Damaged Traffic Signal', 'Road Erosion', 'Collapsed Bridge', 'Other'];
const SEVERITIES = [
  { value: 'severe', label: 'Severe', color: 'bg-destructive' },
  { value: 'moderate', label: 'Moderate', color: 'bg-accent' },
  { value: 'minor', label: 'Minor', color: 'bg-primary' },
];

export default function ReportDialog() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const createIssue = useCreateIssue();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [description, setDescription] = useState('');
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success('Location captured');
      },
      () => {
        // Fallback to Lagos center
        setLocation({ lat: 6.5244, lng: 3.3792 });
        setLocating(false);
        toast.info('Using default location (Lagos)');
      },
      { timeout: 5000 }
    );
  };

  const handleSubmit = () => {
    if (!type) { toast.error('Select an issue type'); return; }
    if (!location) { toast.error('Capture your location first'); return; }

    createIssue.mutate(
      {
        type,
        severity,
        description: description || undefined,
        latitude: location.lat,
        longitude: location.lng,
      },
      {
        onSuccess: () => {
          toast.success('Issue reported! +10 points');
          setOpen(false);
          setType('');
          setDescription('');
          setLocation(null);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleOpen = (val: boolean) => {
    if (val && !user) {
      toast.error('Sign in to report issues');
      navigate('/auth');
      return;
    }
    setOpen(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 z-[1000] h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Infrastructure Issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Issue Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Severity</Label>
            <div className="mt-1 flex gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    severity === s.value
                      ? 'border-foreground/30 bg-secondary text-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/20'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              maxLength={500}
              className="mt-1"
            />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={getLocation}
            disabled={locating}
          >
            {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            {location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Capture Location'}
          </Button>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createIssue.isPending}
          >
            {createIssue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
