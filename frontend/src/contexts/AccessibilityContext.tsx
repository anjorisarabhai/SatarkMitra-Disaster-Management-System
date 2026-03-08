import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface AccessibilityState {
  largeText: boolean;
  voiceAlerts: boolean;
  simpleLanguage: boolean;
  setLargeText: (val: boolean) => void;
  setVoiceAlerts: (val: boolean) => void;
  setSimpleLanguage: (val: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityState | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [largeText, setLargeTextState] = useState(() => localStorage.getItem("a11y-largeText") === "true");
  const [voiceAlerts, setVoiceAlertsState] = useState(() => localStorage.getItem("a11y-voiceAlerts") === "true");
  const [simpleLanguage, setSimpleLanguageState] = useState(() => localStorage.getItem("a11y-simpleLanguage") === "true");

  // Apply large text globally
  useEffect(() => {
    document.documentElement.style.fontSize = largeText ? "18px" : "";
    document.documentElement.classList.toggle("a11y-large-text", largeText);
  }, [largeText]);

  // Apply simple language class globally
  useEffect(() => {
    document.documentElement.classList.toggle("a11y-simple-language", simpleLanguage);
  }, [simpleLanguage]);

  const setLargeText = useCallback((val: boolean) => {
    setLargeTextState(val);
    localStorage.setItem("a11y-largeText", String(val));
  }, []);

  const setVoiceAlerts = useCallback((val: boolean) => {
    setVoiceAlertsState(val);
    localStorage.setItem("a11y-voiceAlerts", String(val));
    if (val && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance("Voice alerts enabled. You will hear important updates.");
      speechSynthesis.speak(utterance);
    }
  }, []);

  const setSimpleLanguage = useCallback((val: boolean) => {
    setSimpleLanguageState(val);
    localStorage.setItem("a11y-simpleLanguage", String(val));
  }, []);

  return (
    <AccessibilityContext.Provider value={{ largeText, voiceAlerts, simpleLanguage, setLargeText, setVoiceAlerts, setSimpleLanguage }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}
