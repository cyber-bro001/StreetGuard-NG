import { useState } from 'react';
import { Plus, MapPin, Loader2, AlertTriangle, FileText, Camera, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateIssue } from '@/hooks/useIssues';
import { useAuthContext } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ISSUE_TYPES = ['Pothole', 'Flooded Road', 'Broken Streetlight', 'Accident', 'Road Block'];
const SEVERITIES = [
  { value: 'severe', label: 'Critical', color: 'bg-destructive' },
  { value: 'moderate', label: 'Pending', color: 'bg-accent' },
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
        setLocation({ lat: 6.1956, lng: 6.7314 });
        setLocating(false);
        toast.info('Using default location (Asaba)');
      },
      { timeout: 5000 }
    );
  };

  const handleSubmit = () => {
    if (!type) { toast.error('Select an issue type'); return; }
    if (!location) { toast.error('Capture your location first'); return; }

    createIssue.mutate(
      { type, severity, description: description || undefined, latitude: location.lat, longitude: location.lng },
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
          className="fixed bottom-6 right-6 z-[1000] h-14 w-14 rounded-full shadow-xl"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] rounded-2xl border-border/50 bg-card/95 backdrop-blur-xl">
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
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Photo placeholder */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Camera className="h-3 w-3 text-muted-foreground" />
              Photo (optional)
            </Label>
            <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
              Photo upload coming soon
            </div>
          </div>

          {/* Location */}
          <Button
            variant="outline"
            className="w-full h-9 text-sm"
            onClick={getLocation}
            disabled={locating}
          >
            {locating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <MapPin className="mr-2 h-3.5 w-3.5" />}
            {location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Capture Location'}
          </Button>

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
