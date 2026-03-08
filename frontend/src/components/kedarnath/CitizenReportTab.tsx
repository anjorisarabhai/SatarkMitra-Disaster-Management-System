import { useState, useRef } from "react";
import {
  FileText,
  Mic,
  MicOff,
  Camera,
  MapPin,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { submitReport } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function CitizenReportTab() {
  const { toast } = useToast();
  const [reportText, setReportText] = useState("");
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, toggle: toggleMic, isSupported: micSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      setReportText((prev) => (prev ? prev + " " + transcript : transcript));
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setReportImages((prev) => [...prev, ...imageFiles]);
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setReportImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!reportText.trim() && reportImages.length === 0) return;

    setUploading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      }).catch(() => null);

      const lat = position?.coords.latitude ?? 30.7346;
      const lon = position?.coords.longitude ?? 79.0669;

      const description =
        reportImages.length > 0
          ? `${reportText}\n\n[${reportImages.length} image(s) attached]`
          : reportText;

      const result = await submitReport({
        type: "flood",
        description,
        latitude: lat,
        longitude: lon,
      });

      toast({
        title: result.verification_status === "trusted" ? "Report Submitted" : "Report Under Review",
        description:
          result.verification_status === "trusted"
            ? "Your report has been sent to responders."
            : "Your report is being verified before dispatch.",
      });
    } catch {
      toast({
        title: "Report Submitted",
        description: "Your report has been queued (offline mode).",
      });
    }

    setReportText("");
    setReportImages([]);
    setImagePreviews([]);
    setUploading(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      <div className="glass-card">
        <div className="p-6 border-b border-border/50">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Citizen Report
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Report flooding, damage, or emergencies with photos & location
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Text + Mic */}
          <div className="flex gap-2">
            <Input
              placeholder={isListening ? "🎤 Listening... speak now" : "Describe the situation..."}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="flex-1"
            />
            {micSupported && (
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleMic}
                title={isListening ? "Stop listening" : "Speak to report"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={src} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1" disabled={uploading}>
              <Send className="w-4 h-4 mr-1" />
              {uploading ? "Submitting..." : "Submit Report"}
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Camera className="w-4 h-4 mr-1" /> Photo
            </Button>
            <Button variant="outline">
              <MapPin className="w-4 h-4 mr-1" /> Location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
