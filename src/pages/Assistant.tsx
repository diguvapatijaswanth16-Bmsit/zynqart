import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Camera,
  ImagePlus,
  Languages,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LANGUAGES, copyFor, type LangCode } from "@shared/i18n";
import type { ChatMessage, ChatResult, Recommendation } from "@shared/types";
import { api, streamChat } from "@/lib/api";
import { fileToDataUrl } from "@/lib/image";
import { listen, speak, voiceSupported, type VoiceHandle } from "@/lib/speech";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, GlassCard } from "@/components/ui/primitives";
import { ProductCard } from "@/components/ProductCard";
import { ProductDrawer } from "@/components/ProductDrawer";
import { useToast } from "@/components/Toaster";

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("_") && part.endsWith("_")) return <em key={index}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code key={index} className="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">
              {part.slice(1, -1)}
            </code>
          );
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function ChatMarkdown({ text }: { text: string }) {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  return (
    <div className="prose-chat space-y-1.5 text-[13.5px] leading-relaxed">
      {lines.map((line, index) => {
        const numbered = line.match(/^\s*(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <p key={index} className="flex gap-2">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                {numbered[1]}
              </span>
              <span>
                <Inline text={numbered[2]} />
              </span>
            </p>
          );
        }
        if (/^\s*[-*]\s+/.test(line)) {
          return (
            <p key={index} className="flex gap-2">
              <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>
                <Inline text={line.replace(/^\s*[-*]\s+/, "")} />
              </span>
            </p>
          );
        }
        return (
          <p key={index}>
            <Inline text={line} />
          </p>
        );
      })}
    </div>
  );
}

export default function AssistantPage() {
  const { products, needs, setNeeds, language, setLanguage, aiEnabled } = useStore();
  const { push } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<"llm" | "rules">("llm");
  const [listening, setListening] = useState(false);
  const [visionBusy, setVisionBusy] = useState(false);
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<ChatResult["clarifyingQuestion"]>(null);

  const sessionId = useRef<string>(crypto.randomUUID());
  const voiceRef = useRef<VoiceHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const copy = copyFor(language);
  const openProduct = products.find((p) => p.id === openProductId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming, followUp]);

  const persist = useCallback(
    (list: ChatMessage[]) => {
      if (!list.length) return;
      void api
        .saveSession({
          id: sessionId.current,
          title: list[0].content.slice(0, 90),
          language,
          messages: list.map((m) => ({ role: m.role, content: m.content, needs: m.needs, recommendations: m.recommendations })),
        })
        .catch(() => undefined);
    },
    [language],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      setDraft("");
      setFollowUp(null);
      const userMessage: ChatMessage = { role: "user", content: text, at: Date.now() };
      const history = [...messages, userMessage];
      setMessages(history);
      setBusy(true);
      setStreaming("");
      abortRef.current = new AbortController();

      try {
        await streamChat(
          {
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            language,
            needs,
          },
          {
            onMeta: (next) => setSource(next),
            onDelta: (chunk) => setStreaming((current) => current + chunk),
            onError: (message) => push({ title: "Assistant fell back to local matching", description: message, variant: "error" }),
            onResult: (result) => {
              const assistant: ChatMessage = {
                role: "assistant",
                content: result.message,
                recommendations: result.recommendations,
                needs: result.needs,
                at: Date.now(),
              };
              const next = [...history, assistant];
              setMessages(next);
              setStreaming("");
              setNeeds(result.needs);
              setFollowUp(result.clarifyingQuestion ?? null);
              setSource(result.source);
              persist(next);
            },
          },
          abortRef.current.signal,
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          push({ title: "Message failed", description: (error as Error).message, variant: "error" });
          setMessages((current) => [
            ...current,
            {
              role: "assistant",
              content: "I couldn't reach the assistant just now. Try again, or browse **Explore** — the match scores still work offline.",
              at: Date.now(),
            },
          ]);
        }
      } finally {
        setBusy(false);
        setStreaming("");
      }
    },
    [busy, language, messages, needs, persist, push, setNeeds],
  );

  const toggleVoice = useCallback(() => {
    if (listening) {
      voiceRef.current?.stop();
      setListening(false);
      return;
    }
    const handle = listen(language, {
      onPartial: (text) => setDraft(text),
      onFinal: (text) => {
        setDraft(text);
        setListening(false);
        void send(text);
      },
      onError: (message) => push({ title: "Voice input", description: message, variant: "error" }),
      onEnd: () => setListening(false),
    });
    voiceRef.current = handle;
    setListening(Boolean(handle));
  }, [language, listening, push, send]);

  const onImagePicked = useCallback(
    async (file: File) => {
      setVisionBusy(true);
      try {
        const dataUrl = await fileToDataUrl(file);
        const result = await api.vision(dataUrl, language, draft.trim());
        const message: ChatMessage = {
          role: "assistant",
          content: `**${result.note}**${result.source === "rules" ? "\n\n_Visual search needs the AI key — showing text-based matches._" : ""}`,
          recommendations: result.matches as Recommendation[],
          needs: result.needs,
          at: Date.now(),
        };
        const next = [...messages, { role: "user" as const, content: `\u{1F4F7} Image search${draft.trim() ? `: ${draft.trim()}` : ""}`, at: Date.now() }, message];
        setMessages(next);
        setNeeds(result.needs);
        setSource(result.source);
        persist(next);
      } catch (error) {
        push({ title: "Image search failed", description: (error as Error).message, variant: "error" });
      } finally {
        setVisionBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [draft, language, messages, persist, push, setNeeds],
  );

  const newChat = () => {
    abortRef.current?.abort();
    sessionId.current = crypto.randomUUID();
    setMessages([]);
    setStreaming("");
    setFollowUp(null);
    setDraft("");
    setNeeds(null);
    inputRef.current?.focus();
  };

  const hero = messages.length === 0 && !streaming && !busy;
  const openDrawer = (id: string) => setOpenProductId(id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="secondary">
            <Sparkles className="h-3 w-3" aria-hidden /> AI Shopping Assistant
          </Badge>
          <Badge tone={source === "llm" && aiEnabled ? "success" : "warning"}>
            <Zap className="h-3 w-3" aria-hidden />
            {aiEnabled ? (source === "llm" ? "LLM live" : "Local matcher") : "Key not set — local matcher"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="assistant-language">
            Reply language
          </label>
          <div className="relative flex items-center">
            <Languages className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <select
              id="assistant-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value as LangCode)}
              className="h-9 rounded-full border border-border/70 bg-white/5 pl-8 pr-7 text-xs focus-visible:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-background">
                  {l.native}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={newChat} disabled={!messages.length && !streaming}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> New chat
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {hero ? (
          <motion.section
            key="hero"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative overflow-hidden rounded-[2rem] px-5 py-12 text-center sm:px-10 sm:py-16"
          >
            <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-64 w-64 animate-float rounded-full bg-primary/25 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 animate-float rounded-full bg-secondary/25 blur-3xl [animation-delay:2s]" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/90">Zynqart Assistant</p>
            <h1 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Find the <span className="text-gradient">right product</span>,
              <br className="hidden sm:block" /> not just any product.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              {copy.assistantTagline} Laptops, phones, headphones, cameras, appliances — and clothes. Ask in{" "}
              {LANGUAGES.find((l) => l.code === language)?.native}, and get answers in the same language.
            </p>

            <div className="mx-auto mt-7 grid max-w-3xl gap-2.5 sm:grid-cols-3">
              {copy.suggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.07 }}
                  className="glass group rounded-2xl p-3.5 text-left text-[13px] leading-snug transition hover:border-primary/50"
                >
                  <span className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-[11px] text-primary">
                    {index + 1}
                  </span>
                  {suggestion}
                </motion.button>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1">
                <Mic className="h-3 w-3" aria-hidden /> Voice shopping
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1">
                <Camera className="h-3 w-3" aria-hidden /> Photo search
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1">
                <Languages className="h-3 w-3" aria-hidden /> 8 languages
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1">
                <Sparkles className="h-3 w-3" aria-hidden /> Every match explained
              </span>
            </div>
          </motion.section>
        ) : (
          <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-lg shadow-primary/20">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={index} className="space-y-3">
                  <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                        <Sparkles className="h-3 w-3" aria-hidden /> Zynqart
                      </span>
                      <button
                        type="button"
                        onClick={() => speak(message.content, language)}
                        className="rounded-full p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                        aria-label="Read this answer aloud"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <ChatMarkdown text={message.content} />
                    {message.needs ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {message.needs.category ? <Badge tone="primary">{message.needs.category}</Badge> : null}
                        {message.needs.budget ? <Badge tone="success">≤ ₹{message.needs.budget.toLocaleString("en-IN")}</Badge> : null}
                        {message.needs.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {message.recommendations?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {message.recommendations.slice(0, 3).map((rec, recIndex) => (
                        <ProductCard key={rec.product.id} scored={rec} onOpen={openDrawer} index={recIndex} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ),
            )}

            {streaming ? (
              <div className="glass rounded-2xl rounded-bl-md px-4 py-3" aria-live="polite">
                <span className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  <Sparkles className="h-3 w-3" aria-hidden /> Zynqart is thinking
                </span>
                <ChatMarkdown text={streaming} />
                <span aria-hidden className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-primary align-middle" />
              </div>
            ) : null}

            {busy && !streaming ? (
              <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-muted-foreground">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-secondary [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                Matching your needs against 66 products…
              </div>
            ) : null}

            {followUp ? (
              <button
                type="button"
                onClick={() => void send(followUp)}
                className="rounded-full border border-secondary/40 bg-secondary/10 px-3.5 py-1.5 text-xs text-secondary transition hover:bg-secondary/20"
              >
                {followUp}
              </button>
            ) : null}

            <div ref={bottomRef} />
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard className="sticky bottom-3 z-30 mt-6 p-2.5">
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileRef.current?.click()}
            aria-label="Search by image"
            disabled={visionBusy}
            className="shrink-0"
          >
            {visionBusy ? <Camera className="h-4 w-4 animate-pulse" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Upload a product photo"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImagePicked(file);
            }}
          />
          <Button
            variant={listening ? "danger" : "ghost"}
            size="icon"
            onClick={toggleVoice}
            aria-pressed={listening}
            aria-label={listening ? copy.stopListening : copy.listen}
            className="shrink-0"
          >
            {listening ? <MicOff className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
          </Button>
          <label htmlFor="assistant-input" className="sr-only">
            Describe what you want to buy
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
            placeholder={listening ? copy.stopListening : copy.placeholder}
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border/60 bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/70 focus-visible:border-primary/50 focus-visible:outline-none"
          />
          <Button
            size="icon"
            onClick={() => void send(draft)}
            disabled={!draft.trim() || busy}
            aria-label="Send message"
            className="shrink-0"
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mic className="h-2.5 w-2.5" aria-hidden /> {voiceSupported() ? "Voice ready" : "Voice needs Chrome/Safari"}
          </span>
          <span>Enter to send · Shift+Enter for a new line</span>
          <span className={cn("ml-auto", aiEnabled ? "text-emerald-400/80" : "text-amber-400/80")}>
            {aiEnabled ? "AI answers via secure server" : "Rule-based answers (no AI key configured)"}
          </span>
        </div>
      </GlassCard>

      <ProductDrawer product={openProduct} onClose={() => setOpenProductId(null)} />
    </div>
  );
}
