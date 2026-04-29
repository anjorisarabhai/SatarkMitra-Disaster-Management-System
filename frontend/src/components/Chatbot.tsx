import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Mic, MicOff, MapPin, AlertTriangle,
  Phone, Navigation, FileText, Shield, Users, BarChart3,
  ChevronRight, Loader2, Volume2, VolumeX, Trash2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel, type UserRole } from "@/lib/roles";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  quickReplies?: string[];
}

interface ChatbotProps {
  embedded?: boolean;
}

const QUICK_ACTIONS: Record<UserRole, string[]> = {
  citizen: ["🚨 Emergency Help", "📍 Nearest Shelter", "⚠️ Check Risk", "📝 Report Flood"],
  first_responder: ["🚑 Urgent Reports", "📍 Incident Locations", "👥 Team Status", "🗺️ Best Route"],
  govt_official: ["📊 Risk Summary", "📍 High Risk Zones", "📈 Today's Stats", "🚨 Active Alerts"],
  control_room: ["🚨 Active Incidents", "📋 Team Status", "📞 Emergency Contacts", "🗺️ Live Map"],
  admin: ["📊 System Health", "👥 User Stats", "🔧 Service Status", "📝 Audit Log"],
};

const EMERGENCY_CONTACTS = [
  { name: "NDRF Helpline", number: "011-26107953" },
  { name: "Disaster Mgmt", number: "1078" },
  { name: "Police", number: "100" },
  { name: "Ambulance", number: "108" },
];

const SAFETY_TIPS = {
  flood: [
    "Move to higher ground immediately",
    "Avoid walking/driving through flood waters",
    "Disconnect electrical appliances",
    "Keep emergency kit ready",
  ],
  general: [
    "Stay calm and assess the situation",
    "Follow official instructions",
    "Help elderly and children first",
    "Keep phone charged for emergencies",
  ],
};

// 🆕 API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Chatbot({ embedded = false }: ChatbotProps) {
  const { user } = useAuth();
  const { voiceAlerts, simpleLanguage } = useAccessibility();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [voiceEnabled, setVoiceEnabled] = useState(voiceAlerts);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // 🆕 Session ID for multi-session chat support
  const [sessionId] = useState(() => 
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const userRole = (user?.role || "citizen") as UserRole;
  const quickActions = QUICK_ACTIONS[userRole] || QUICK_ACTIONS.citizen;

  // 🎤 Initialize Speech Recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === "hi" ? "hi-IN" : "en-IN";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({ 
          title: language === "hi" ? "वॉइस पहचान विफल" : "Voice recognition failed", 
          description: language === "hi" ? "कृपया पुनः प्रयास करें" : "Please try again" 
        });
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [language, toast]);

  // 📍 Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("Location access denied")
      );
    }
  }, []);

  // 💬 Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🎯 Welcome message based on role
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessages: Record<UserRole, string> = {
        citizen: "👋 Hi! I'm SatarkMitra AI. I can help you with flood safety, finding shelters, and reporting emergencies. How can I assist you?",
        first_responder: "🚑 Welcome, Responder! I can show urgent reports, team locations, and optimal routes. What do you need?",
        govt_official: "📊 Hello! I can provide risk summaries, zone analytics, and alert overviews. What would you like to know?",
        control_room: "🎧 Control Room ready. I can show active incidents, team status, and communication logs. How can I help?",
        admin: "🔧 Admin access. System health, user management, and audit logs available. What would you like to check?",
      };
      
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: welcomeMessages[userRole],
        timestamp: new Date(),
        quickReplies: quickActions,
      }]);
    }
  }, [isOpen, userRole, quickActions, messages.length]);

  // 🎤 Toggle voice input
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // 🔊 Text-to-Speech
  const speak = (text: string) => {
    if (!voiceEnabled || !voiceAlerts) return;
    
    // Clean text for speech (remove emojis/special chars)
    const cleanText = text.replace(/[^\w\s.,!?₹\-:()\u0900-\u097F]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  // 🆕 Get JWT token from storage
  const getAuthToken = (): string | null => {
    return localStorage.getItem("auth_token") || (user as any)?.token || null;
  };

  // 🆕 Clear chat history
  const clearChatHistory = async () => {
    const token = getAuthToken();
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage chat history",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await fetch(`${API_URL}/chat/clear`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      
      setMessages([]);
      toast({ 
        title: language === "hi" ? "चैट साफ़ की गई" : "Chat cleared", 
        description: language === "hi" ? "नई बातचीत शुरू" : "Starting fresh conversation" 
      });
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  };

  // 🧠 Process quick actions locally (offline-capable)
  const handleQuickAction = (action: string) => {
    let response = "";
    
    if (action.includes("Emergency") || action.includes("Help")) {
      const contacts = EMERGENCY_CONTACTS.map(c => `${c.name}: ${c.number}`).join("\n");
      response = `🚨 EMERGENCY CONTACTS:\n${contacts}\n\n⚠️ SAFETY TIPS:\n• ${SAFETY_TIPS.flood.join("\n• ")}`;
    } else if (action.includes("Shelter") || action.includes("Location")) {
      response = userLocation 
        ? `📍 Finding nearest shelters near your location...\n\n🏠 Community Hall, Lajpat Nagar (2.3 km)\n🏫 Govt School, Karol Bagh (3.1 km)\n⛺ Relief Camp, Dwarka (4.5 km)`
        : "📍 Please enable location to find nearest shelters. You can also check the Safety tab in your dashboard.";
    } else if (action.includes("Risk") || action.includes("Summary")) {
      response = "⚠️ CURRENT RISK STATUS:\n• Kedarnath: HIGH (85% flood probability)\n• Delhi NCR: MODERATE (42% probability)\n• Haridwar: MEDIUM (56% probability)\n\nHeavy rainfall expected in next 24 hours.";
    } else if (action.includes("Report")) {
      response = "📝 To file a report, please describe:\n1. What's happening?\n2. Your location\n3. Any injuries/damage?\n\nOr go to the 'Report' tab for full form.";
    } else if (action.includes("Urgent Reports") || action.includes("Incidents")) {
      response = "🚨 ACTIVE INCIDENTS:\n• DR-001: Water rising, 12 trapped (Priority: 97)\n• DR-006: Temple flooded, 45 trapped (Priority: 93)\n• DR-002: Elderly stranded, medical needed (Priority: 89)";
    } else if (action.includes("Team")) {
      response = "👥 TEAM STATUS:\n• Alpha Squad: Deployed (DR-001)\n• Bravo Unit: Deployed (DR-004)\n• Charlie Medics: Available\n• Delta Divers: Returning\n• Echo Rescue: Available";
    } else if (action.includes("Route")) {
      response = "🗺️ OPTIMAL ROUTES:\n• To DR-001: Take NH-107 → Mandakini Road (25 min)\n• To DR-006: Temple Route via Sonprayag (35 min)\n• Alternate: Heli-evac recommended for critical cases";
    } else if (action.includes("System Health")) {
      response = "🔧 SYSTEM STATUS:\n• API Gateway: ✅ Healthy (99.97%)\n• Database: ✅ Healthy (99.99%)\n• AI Inference: ⚠️ Degraded (98.2%)\n• IoT Ingestion: ✅ Healthy (99.91%)";
    } else {
      sendToAI(action);
      return;
    }
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    speak(response);
  };

  // 🤖 Send to AI backend (🆕 UPDATED WITH JWT AUTH)
  const sendToAI = async (userMessage: string) => {
    setIsLoading(true);
    
    try {
      const token = getAuthToken();
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // 🆕 Add Authorization header if token exists
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: userMessage,
          language,
          role: userRole,
          location: userLocation,
          session_id: sessionId,        // 🆕 Session support
          clear_history: false,
        }),
      });
      
      // 🆕 Handle authentication errors
      if (res.status === 401) {
        toast({
          title: language === "hi" ? "प्रमाणीकरण आवश्यक" : "Authentication Required",
          description: language === "hi" 
            ? "कृपया AI सहायक का उपयोग करने के लिए लॉग इन करें" 
            : "Please log in to use the AI assistant",
          variant: "destructive",
        });
        
        const fallbackMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: language === "hi"
            ? "🔐 कृपया AI सहायक का उपयोग करने के लिए लॉग इन करें।"
            : "🔐 Please log in to use the AI assistant.",
          timestamp: new Date(),
          quickReplies: quickActions,
        };
        setMessages(prev => [...prev, fallbackMessage]);
        return;
      }
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      
      // 🆕 Handle priority alerts
      if (data.priority === "critical") {
        toast({
          title: language === "hi" ? "🚨 आपातकालीन प्रतिक्रिया" : "🚨 Emergency Response",
          description: language === "hi"
            ? "गंभीर स्थिति - निर्देशों का तुरंत पालन करें"
            : "Critical situation - follow instructions immediately",
          variant: "destructive",
        });
      } else if (data.priority === "high") {
        toast({
          title: language === "hi" ? "⚠️ उच्च प्राथमिकता" : "⚠️ High Priority",
          description: language === "hi"
            ? "महत्वपूर्ण जानकारी - ध्यान दें"
            : "Important information - pay attention",
        });
      }
      
      // 🆕 Extract actions from backend response
      const backendActions = data.actions?.map((a: any) => a.label) || quickActions;
      
      // 🆕 Log context summary for debugging (optional)
      if (data.context_summary && data.context_summary.length > 0) {
        console.log("🤖 AI Context:", data.context_summary);
      }
      
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response || (language === "hi" 
          ? "मैं यहाँ मदद के लिए हूँ। कृपया अपना प्रश्न दोबारा पूछें।"
          : "I'm here to help. Could you please rephrase your question?"),
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        quickReplies: backendActions,
      };
      
      setMessages(prev => [...prev, aiMessage]);
      speak(aiMessage.content);
      
    } catch (error) {
      console.error("Chat error:", error);
      
      // Fallback responses for offline mode
      const fallbackMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: language === "hi"
          ? "📡 मैं ऑफलाइन मोड में हूं। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।"
          : "📡 I'm in offline mode. Please check your connection and try again.",
        timestamp: new Date(),
        quickReplies: quickActions,
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 💬 Handle message send
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = input;
    setInput("");
    
    // Check if it's a quick action
    if (quickActions.includes(messageToSend)) {
      handleQuickAction(messageToSend);
    } else {
      await sendToAI(messageToSend);
    }
  };

  // Floating button (if not embedded)
  if (!embedded && !isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
        onClick={() => setIsOpen(true)}
        aria-label="Open chat assistant"
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
      </motion.button>
    );
  }

  // Main chatbot UI
  return (
    <motion.div
      initial={embedded ? {} : { opacity: 0, y: 20 }}
      animate={embedded ? {} : { opacity: 1, y: 0 }}
      className={embedded 
        ? "w-full h-full flex flex-col" 
        : "fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-2xl"
      }
    >
      <Card className="w-full h-full flex flex-col overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">SatarkMitra AI</h3>
                <p className="text-xs text-muted-foreground">{getRoleLabel(userRole)} Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Language Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLanguage(l => l === "en" ? "hi" : "en")}
                className="text-xs px-2"
              >
                {language === "en" ? "हिंदी" : "English"}
              </Button>
              
              {/* Voice Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="w-8 h-8"
                title={voiceEnabled ? "Disable voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              
              {/* 🆕 Clear Chat Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChatHistory}
                className="w-8 h-8"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              
              {/* Close button (only for floating mode) */}
              {!embedded && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* 🆕 Location Status Indicator */}
          {userLocation && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 text-green-500" />
              <span>Location enabled</span>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : msg.role === "system"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-foreground text-xs italic"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <p className={`text-sm whitespace-pre-wrap ${simpleLanguage ? "text-base" : ""}`}>
                      {msg.content}
                    </p>
                  </div>
                  
                  {/* Quick Reply Buttons */}
                  {msg.quickReplies && msg.role === "assistant" && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.quickReplies.slice(0, 4).map((action) => (
                        <Badge
                          key={action}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80 transition-colors py-1.5 px-3"
                          onClick={() => handleQuickAction(action)}
                        >
                          {action}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <span className="text-[10px] text-muted-foreground">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs text-muted-foreground">
                  {language === "hi" ? "AI सोच रहा है..." : "AI is thinking..."}
                </span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/50 bg-background/50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={isListening 
                ? (language === "hi" ? "🎤 सुन रहा हूं..." : "🎤 Listening...") 
                : (language === "hi" ? "अपना संदेश लिखें..." : "Type your message...")
              }
              className="flex-1"
              disabled={isLoading}
            />
            
            {"webkitSpeechRecognition" in window && (
              <Button
                variant={isListening ? "destructive" : "outline"}
                size="icon"
                onClick={toggleListening}
                disabled={isLoading}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
            
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Quick Action Buttons (compact) */}
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            {quickActions.slice(0, 4).map((action) => (
              <Button
                key={action}
                variant="ghost"
                size="sm"
                className="text-xs whitespace-nowrap flex-shrink-0"
                onClick={() => handleQuickAction(action)}
              >
                {action}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}