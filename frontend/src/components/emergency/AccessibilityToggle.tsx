import { Accessibility, Type, Volume2, Languages } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useToast } from "@/hooks/use-toast";

export function AccessibilityToggle() {
  const { largeText, voiceAlerts, simpleLanguage, setLargeText, setVoiceAlerts, setSimpleLanguage } = useAccessibility();
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Accessibility className="w-5 h-5 text-primary" />
          Accessibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Large Text Mode</span>
          </div>
          <Switch checked={largeText} onCheckedChange={(val) => {
            setLargeText(val);
            toast({ title: val ? "Large text enabled" : "Large text disabled" });
          }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Voice Alerts</span>
          </div>
          <Switch checked={voiceAlerts} onCheckedChange={(val) => {
            setVoiceAlerts(val);
            toast({ title: val ? "Voice alerts enabled" : "Voice alerts disabled" });
          }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Simple Language</span>
          </div>
          <Switch checked={simpleLanguage} onCheckedChange={(val) => {
            setSimpleLanguage(val);
            toast({ title: val ? "Simple language enabled" : "Simple language disabled" });
          }} />
        </div>
      </CardContent>
    </Card>
  );
}
