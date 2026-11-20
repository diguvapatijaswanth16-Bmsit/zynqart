import { languageOf } from "@shared/i18n";

interface SpeechResultEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

interface RecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionInstance;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function voiceSupported(): boolean {
  return Boolean(recognitionCtor());
}

export interface VoiceHandle {
  stop: () => void;
}

export function listen(
  language: string,
  handlers: {
    onPartial?: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (message: string) => void;
    onEnd?: () => void;
  },
): VoiceHandle | null {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError("Voice input needs Chrome, Edge or Safari. You can still type your request.");
    return null;
  }
  const recognition = new Ctor();
  recognition.lang = languageOf(language).speech;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) final += result[0].transcript;
      else interim += result[0].transcript;
    }
    if (interim) handlers.onPartial?.(interim);
    if (final.trim()) handlers.onFinal(final.trim());
  };
  recognition.onerror = (event) => {
    const map: Record<string, string> = {
      "not-allowed": "Microphone access was blocked. Allow it in your browser settings to use voice shopping.",
      "no-speech": "I didn't catch that — try again a little closer to the mic.",
      network: "Speech recognition needs an internet connection.",
      "audio-capture": "No microphone found on this device.",
    };
    handlers.onError(map[event.error] ?? "Voice input failed. Try typing instead.");
  };
  recognition.onend = () => handlers.onEnd?.();

  try {
    recognition.start();
  } catch {
    handlers.onError("Voice input is already running.");
    return null;
  }
  return { stop: () => recognition.stop() };
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, language: string): void {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    text
      .replace(/\*\*|__|`|_/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .slice(0, 600),
  );
  utterance.lang = languageOf(language).speech;
  utterance.rate = 0.98;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang === utterance.lang);
  if (voice) utterance.voice = voice;
  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  activeUtterance = null;
}

export function isSpeaking(): boolean {
  return Boolean(activeUtterance) && "speechSynthesis" in window && window.speechSynthesis.speaking;
}
