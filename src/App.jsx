import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Upload, Copy, Download, Trash2, Clock,
  AudioLines, CheckCheck, Zap, History,
  LayoutDashboard, Volume2, Sparkles, FileText,
  ChevronRight, Activity, Cpu,
} from "lucide-react";
import jsPDF from "jspdf";

const STORAGE_KEY = "voxintel_history";

// -----------------------------------------------------------
// AI TEXT FORMATTER
// Sends the raw transcript to Claude API.
// Claude adds commas, full stops, question marks,
// paragraph breaks, capitalisation — like a human editor.
// -----------------------------------------------------------
async function formatWithAI(raw) {
  if (!raw || raw.trim().length < 3) return raw;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content:
              "You are a professional transcript editor. Reformat the raw speech-to-text output below into clean, readable text.\n\n" +
              "Rules:\n" +
              "- Add correct punctuation: commas, full stops, question marks, exclamation marks\n" +
              "- Capitalise the start of every sentence and all proper nouns\n" +
              "- Remove filler words: uh, um, hmm, er, like, you know\n" +
              "- Group into logical paragraphs every 3-5 sentences\n" +
              "- Do NOT change the meaning or invent new words\n" +
              "- Do NOT add headings, bullets, or markdown\n" +
              "- Return ONLY the formatted text, nothing else\n\n" +
              "Raw transcript:\n" +
              raw,
          },
        ],
      }),
    });
    const data = await res.json();
    const formatted = data?.content?.[0]?.text?.trim();
    return formatted && formatted.length > 0 ? formatted : raw;
  } catch {
    // Fallback basic cleanup if AI call fails
    let text = raw.trim();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/\b(uh+|um+|hmm+|er+)\b,?\s*/gi, "");
    if (!/[.?!]$/.test(text)) text += ".";
    return text;
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// -----------------------------------------------------------
// WAVEFORM BARS
// -----------------------------------------------------------
function WaveformBars({ active, count = 28, color = "from-violet-500 to-cyan-400" }) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 36 }}>
      {Array.from({ length: count }).map((_, i) => {
        const base = 3 + Math.sin(i * 0.6) * 2;
        return (
          <motion.div
            key={i}
            className={`w-[3px] rounded-full bg-gradient-to-t ${color}`}
            animate={
              active
                ? { height: [base, base + 8 + Math.abs(Math.sin(i)) * 16, base] }
                : { height: base }
            }
            transition={{
              duration: 0.45 + (i % 5) * 0.07,
              repeat: Infinity,
              delay: i * 0.04,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------
// ORBIT LOADER
// -----------------------------------------------------------
function OrbitLoader() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: "2px solid transparent",
          borderTopColor: "#8b5cf6",
          borderRightColor: "rgba(139,92,246,0.2)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          border: "2px solid transparent",
          borderBottomColor: "#3b82f6",
          borderLeftColor: "rgba(59,130,246,0.2)",
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-600/40"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      >
        <Cpu className="w-4 h-4 text-white" />
      </motion.div>
    </div>
  );
}

// -----------------------------------------------------------
// TYPEWRITER TEXT
// -----------------------------------------------------------
function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 14);
    return () => clearInterval(id);
  }, [text]);

  return (
    <p className="text-white/80 text-sm leading-8 whitespace-pre-wrap font-light tracking-wide">
      {displayed}
      {!done && (
        <motion.span
          className="inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </p>
  );
}

// -----------------------------------------------------------
// GLASS CARD
// -----------------------------------------------------------
function GlassCard({ children, className = "", hover = true, glow = false }) {
  return (
    <motion.div
      whileHover={
        hover
          ? {
              y: -3,
              boxShadow: glow
                ? "0 0 50px rgba(139,92,246,0.18), 0 24px 64px rgba(0,0,0,0.45)"
                : "0 24px 64px rgba(0,0,0,0.35)",
            }
          : {}
      }
      transition={{ duration: 0.25 }}
      className={`bg-white/[0.04] border border-white/[0.09] rounded-2xl backdrop-blur-2xl relative overflow-hidden ${className}`}
    >
      {glow && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-blue-600/5 pointer-events-none" />
      )}
      {children}
    </motion.div>
  );
}

// -----------------------------------------------------------
// GRADIENT BUTTON
// -----------------------------------------------------------
function GradBtn({ onClick, disabled, children, variant = "primary", className = "" }) {
  const base =
    "relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden cursor-pointer";
  const variants = {
    primary:
      "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost:
      "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
    danger:
      "border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20",
  };
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {variant === "primary" && !disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 pointer-events-none"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
      )}
      {children}
    </motion.button>
  );
}

// -----------------------------------------------------------
// FLOATING PARTICLES
// -----------------------------------------------------------
function Particles() {
  const pts = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    dur: 8 + Math.random() * 14,
    delay: Math.random() * 8,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {pts.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-violet-400/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [-20, 20, -20], opacity: [0.08, 0.4, 0.08] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------
// GRID OVERLAY
// -----------------------------------------------------------
function GridOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 opacity-[0.022]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(139,92,246,1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)
        `,
        backgroundSize: "64px 64px",
      }}
    />
  );
}

// -----------------------------------------------------------
// HISTORY CARD
// -----------------------------------------------------------
function HistoryCard({ item, onDelete, index }) {
  const [expanded, setExpanded] = useState(false);
  const preview = item.text?.slice(0, 130);
  const hasMore = item.text?.length > 130;
  const wc = item.text?.split(/\s+/).filter(Boolean).length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -3, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}
    >
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl backdrop-blur-2xl p-5 flex flex-col gap-4 relative overflow-hidden group">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-sm leading-relaxed">
              {expanded ? item.text : preview}
              {hasMore && !expanded && "..."}
            </p>
            {hasMore && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-violet-400/70 hover:text-violet-400 text-xs mt-1.5 transition-colors"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-all flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {item.audioUrl && (
          <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Volume2 className="w-3 h-3 text-white/25" />
              <span className="text-xs text-white/25">Playback</span>
            </div>
            <audio
              src={item.audioUrl}
              controls
              className="w-full rounded-lg"
              style={{ height: 36, filter: "invert(0.85) hue-rotate(200deg) saturate(1.5)" }}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
          <div className="flex items-center gap-1.5 text-white/25 text-xs">
            <Clock className="w-3 h-3" />
            {formatTime(item.timestamp)}
          </div>
          <div className="text-white/20 text-xs">{wc} words</div>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------
// MAIN APP
// -----------------------------------------------------------
export default function App() {
  const [view, setView] = useState("studio");
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const STEPS = [
    "Uploading audio...",
    "Analyzing speech patterns...",
    "Running AI transcription...",
    "Formatting with AI editor...",
    "Finalizing output...",
  ];

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (recording) {
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  const saveHistory = (items) => {
    setHistory(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscript("");
  };

  const handleReset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript("");
    setWordCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;
    setProcessing(true);
    setTranscript("");
    setWordCount(0);

    let step = 0;
    setProcessingStep(0);
    const stepTimer = setInterval(() => {
      step = Math.min(step + 1, STEPS.length - 1);
      setProcessingStep(step);
    }, 1000);

    try {
      // Step 1: Send audio to your backend
      const form = new FormData();
      const mimeType = audioBlob.type || "audio/webm";
      const ext = mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("wav")
        ? "wav"
        : mimeType.includes("mp3")
        ? "mp3"
        : "webm";
      form.append("audio", audioBlob, `audio.${ext}`);

      const res = await fetch("https://backend-vtvz.onrender.com/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.text();
        setTranscript(`Server error ${res.status}: ${err}`);
        return;
      }

      const data = await res.json();
      const raw = data.transcription || data.text || data.result || "";

      if (!raw) {
        setTranscript("No transcription returned from server. Check your backend.");
        return;
      }

      // Step 2: Send raw text to Claude AI for proper formatting
      setProcessingStep(3);
      const formatted = await formatWithAI(raw);

      setTranscript(formatted);
      const wc = formatted.split(/\s+/).filter(Boolean).length;
      setWordCount(wc);

      saveHistory([
        {
          id: Date.now().toString(),
          text: formatted,
          audioUrl,
          timestamp: new Date().toISOString(),
        },
        ...history,
      ]);
    } catch (err) {
      setTranscript(
        `Connection error: ${err.message}\n\nMake sure your backend is running on localhost:5000.`
      );
    } finally {
      clearInterval(stepTimer);
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = () => {
    if (!transcript) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFillColor(109, 40, 217);
    doc.rect(0, 0, 595, 58, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("VoxIntel AI - Transcript", 40, 36);
    doc.setTextColor(110, 110, 140);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleString()}  |  Words: ${wordCount}`,
      40,
      72
    );
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(40, 80, 555, 80);
    doc.setTextColor(28, 28, 48);
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(transcript, 515);
    doc.text(lines, 40, 98);
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 200);
      doc.text(`VoxIntel AI  |  Page ${i} of ${total}`, 40, 820);
    }
    doc.save("voxintel-transcript.pdf");
  };

  const fmtSecs = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#020617] via-[#04081a] to-[#0c1230] text-white relative overflow-x-hidden"
      style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}
    >
      <Particles />
      <GridOverlay />

      {/* Ambient blobs */}
      <div className="fixed top-[-300px] left-[-150px] w-[700px] h-[700px] rounded-full bg-violet-700/8 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-blue-700/8 blur-[120px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full bg-indigo-900/8 blur-[120px] pointer-events-none" />

      {/* NAVBAR */}
      <nav className="relative z-20 border-b border-white/[0.06] bg-black/30 backdrop-blur-2xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <AudioLines className="w-5 h-5 text-white" />
              </div>
              <motion.div
                className="absolute -inset-1 rounded-xl bg-gradient-to-br from-violet-600/40 to-blue-600/40 blur-sm -z-10"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </div>
            <div className="leading-none">
              <span className="text-white font-bold text-lg tracking-tight">Vox</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400 font-bold text-lg">
                Intel
              </span>
              <span className="text-white/30 font-medium text-xs ml-1.5 tracking-widest uppercase">
                AI
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1"
          >
            {[
              { id: "studio", icon: LayoutDashboard, label: "Studio" },
              { id: "history", icon: History, label: "History" },
            ].map(({ id, icon: Icon, label }) => (
              <motion.button
                key={id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setView(id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  view === id ? "text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {view === id && (
                  <motion.div
                    layoutId="navpill"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600/80 to-blue-600/80"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{label}</span>
              </motion.button>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 text-xs font-medium"
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            System Online
          </motion.div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-24">

        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center pt-16 pb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/25 bg-violet-500/8 text-violet-300 text-xs font-medium mb-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.div>
            Powered by Advanced AI Speech Recognition
            <ChevronRight className="w-3 h-3 opacity-50" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl lg:text-[62px] font-bold tracking-tight leading-[1.1] mb-5"
          >
            <span className="text-white">AI Speech </span>
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300">
                Intelligence
              </span>
              <motion.div
                className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.7 }}
              />
            </span>
            <br />
            <span className="text-white/45 font-semibold text-3xl sm:text-4xl lg:text-[46px]">
              &amp; Transcription
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-white/40 text-base sm:text-lg max-w-md mx-auto leading-relaxed"
          >
            Convert spoken audio into accurate, AI-formatted text with proper punctuation and paragraphs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-8 mt-8"
          >
            {[
              { label: "Accuracy", value: "98.5%" },
              { label: "Languages", value: "50+" },
              { label: "AI Edited", value: "Yes" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-blue-300">
                  {value}
                </div>
                <div className="text-white/25 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === "studio" ? (
            <motion.div
              key="studio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT — Input Panel */}
                <GlassCard className="p-7" glow>
                  <div className="flex items-center justify-between mb-7">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/30 to-violet-600/5 border border-violet-500/20 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Audio Input</p>
                        <p className="text-xs text-white/25 mt-0.5">
                          Record or upload your source audio
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/25">
                      <Activity className="w-3 h-3" />
                      {audioBlob ? "Ready" : "Idle"}
                    </div>
                  </div>

                  {/* Upload & Record */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFileUpload(e.dataTransfer.files[0]);
                    }}
                    className="grid grid-cols-2 gap-4 mb-5"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group flex flex-col items-center gap-4 p-7 rounded-2xl border transition-all duration-300 ${
                        dragOver
                          ? "border-violet-500/60 bg-violet-500/10"
                          : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05] hover:border-blue-500/30"
                      }`}
                    >
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center group-hover:border-blue-500/40 transition-colors">
                          <Upload className="w-6 h-6 text-blue-400" />
                        </div>
                        <motion.div
                          className="absolute -inset-2 rounded-2xl bg-blue-500/8 blur-lg"
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2.5, repeat: Infinity }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white/80">Upload File</p>
                        <p className="text-xs text-white/25 mt-1">MP3, WAV, OGG, M4A</p>
                      </div>
                    </motion.button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={recording ? stopRecording : startRecording}
                      className={`group flex flex-col items-center gap-4 p-7 rounded-2xl border transition-all duration-300 ${
                        recording
                          ? "border-red-500/40 bg-red-500/8"
                          : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05] hover:border-violet-500/30"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        {recording &&
                          [1.5, 2.1, 2.8].map((s, i) => (
                            <motion.div
                              key={i}
                              className="absolute rounded-full bg-red-500/12"
                              style={{ inset: -4 * i }}
                              animate={{ scale: [1, s], opacity: [0.5, 0] }}
                              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
                            />
                          ))}
                        <div
                          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            recording
                              ? "bg-gradient-to-br from-red-500 to-pink-600 shadow-xl shadow-red-500/35"
                              : "bg-violet-600/15 border border-violet-500/20 group-hover:border-violet-500/40"
                          }`}
                        >
                          {recording ? (
                            <MicOff className="w-6 h-6 text-white" />
                          ) : (
                            <Mic className="w-6 h-6 text-violet-400" />
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white/80">
                          {recording ? "Stop" : "Record Audio"}
                        </p>
                        {recording ? (
                          <p className="text-xs text-red-400 mt-1 font-mono">
                            {fmtSecs(recordSeconds)}
                          </p>
                        ) : (
                          <p className="text-xs text-white/25 mt-1">Use microphone</p>
                        )}
                      </div>
                    </motion.button>
                  </div>

                  {/* Recording live indicator */}
                  <AnimatePresence>
                    {recording && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-5 overflow-hidden"
                      >
                        <div className="p-4 rounded-xl bg-red-500/8 border border-red-500/15 flex items-center gap-4">
                          <motion.div
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="flex-shrink-0 w-2 h-2 rounded-full bg-red-400"
                          />
                          <WaveformBars active={true} count={30} color="from-red-500 to-pink-400" />
                          <div className="ml-auto text-right flex-shrink-0">
                            <p className="text-red-300 text-xs font-bold tracking-widest">LIVE</p>
                            <p className="text-red-400/60 text-xs font-mono">
                              {fmtSecs(recordSeconds)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Audio preview */}
                  <AnimatePresence>
                    {audioUrl && !recording && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="mb-5"
                      >
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                          <div className="flex items-center gap-2 mb-3">
                            <motion.div
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                              animate={{ scale: [1, 1.4, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <Volume2 className="w-3.5 h-3.5 text-white/35" />
                            <span className="text-xs text-white/35 font-medium">
                              Audio Ready — Click Analyze to transcribe
                            </span>
                          </div>
                          <audio
                            src={audioUrl}
                            controls
                            className="w-full rounded-lg"
                            style={{
                              height: 40,
                              filter: "invert(0.85) hue-rotate(200deg) saturate(1.5)",
                            }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Reset + Analyze */}
                  <AnimatePresence>
                    {audioUrl && !recording && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                      >
                        <GradBtn variant="ghost" onClick={handleReset} className="flex-1">
                          Reset
                        </GradBtn>
                        <GradBtn
                          onClick={handleAnalyze}
                          disabled={processing}
                          className="flex-1"
                        >
                          {processing ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                              />
                              Analyzing
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" /> Analyze Audio
                            </>
                          )}
                        </GradBtn>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!audioUrl && !recording && (
                    <div className="flex flex-col items-center gap-3 py-5 text-center">
                      <WaveformBars active={false} count={22} />
                      <p className="text-white/20 text-sm">Upload a file or record to begin</p>
                    </div>
                  )}
                </GlassCard>

                {/* RIGHT — Output Panel */}
                <GlassCard className="p-7 flex flex-col" glow>
                  <div className="flex items-center justify-between mb-7">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Studio Output</p>
                        <p className="text-xs text-white/25 mt-0.5">
                          {wordCount > 0
                            ? `${wordCount} words transcribed`
                            : "AI transcription result"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={handleCopy}
                        disabled={!transcript || processing}
                        title="Copy transcript"
                        className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.09] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <AnimatePresence mode="wait">
                          {copied ? (
                            <motion.div
                              key="ck"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <CheckCheck className="w-4 h-4 text-emerald-400" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="cp"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Copy className="w-4 h-4 text-white/45" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={handleDownloadPDF}
                        disabled={!transcript || processing}
                        title="Download PDF"
                        className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.09] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4 text-white/45" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[300px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {processing ? (
                        <motion.div
                          key="proc"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-6 w-full"
                        >
                          <OrbitLoader />
                          <div className="text-center">
                            <motion.p
                              key={processingStep}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-white/70 text-sm font-medium"
                            >
                              {STEPS[processingStep]}
                            </motion.p>
                            <p className="text-white/25 text-xs mt-1.5">Please wait...</p>
                          </div>
                          <div className="w-full max-w-xs bg-white/5 rounded-full h-1 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full"
                              animate={{
                                width: `${((processingStep + 1) / STEPS.length) * 100}%`,
                              }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </motion.div>
                      ) : transcript ? (
                        <motion.div
                          key="tx"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="w-full"
                        >
                          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                              <motion.div
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                animate={{ scale: [1, 1.4, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <span className="text-emerald-400 text-xs font-medium">
                                Transcription Complete
                              </span>
                            </div>
                            <div className="ml-auto text-xs text-white/25 flex items-center gap-1.5">
                              <FileText className="w-3 h-3" />
                              {wordCount} words
                            </div>
                          </div>
                          <div className="max-h-[340px] overflow-y-auto pr-1 custom-scroll">
                            <TypewriterText text={transcript} />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-5"
                        >
                          <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-white/[0.025] border border-white/[0.06] flex items-center justify-center">
                              <WaveformBars active={false} count={16} />
                            </div>
                            <motion.div
                              className="absolute -inset-3 rounded-3xl bg-violet-500/5 blur-xl"
                              animate={{ opacity: [0.3, 0.7, 0.3] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                          </div>
                          <div className="text-center">
                            <p className="text-white/30 text-sm font-semibold">Awaiting Signal</p>
                            <p className="text-white/15 text-xs mt-1.5 max-w-[200px]">
                              Transcription will appear here after analysis
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </GlassCard>
              </div>

              {/* Recent history strip */}
              <AnimatePresence>
                {history.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-10"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                          <History className="w-3.5 h-3.5 text-white/35" />
                        </div>
                        <span className="text-sm font-semibold text-white/55">
                          Recent Transcripts
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/30 text-xs border border-white/[0.06]">
                          {history.length}
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        onClick={() => setView("history")}
                        className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                      >
                        View all <ChevronRight className="w-3 h-3" />
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {history.slice(0, 3).map((item, i) => (
                        <HistoryCard
                          key={item.id}
                          item={item}
                          index={i}
                          onDelete={() =>
                            saveHistory(history.filter((h) => h.id !== item.id))
                          }
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* HISTORY VIEW */
            <motion.div
              key="histview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex items-center justify-between mb-7">
                <div>
                  <h2 className="text-xl font-bold text-white">Transcript History</h2>
                  <p className="text-white/30 text-sm mt-1">
                    {history.length} transcript{history.length !== 1 ? "s" : ""} stored on
                    this device
                  </p>
                </div>
                {history.length > 0 && (
                  <GradBtn variant="danger" onClick={() => saveHistory([])}>
                    <Trash2 className="w-4 h-4" /> Clear All
                  </GradBtn>
                )}
              </div>

              {history.length === 0 ? (
                <GlassCard className="p-20 text-center" hover={false}>
                  <motion.div
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5"
                  >
                    <History className="w-7 h-7 text-white/15" />
                  </motion.div>
                  <p className="text-white/30 font-semibold">No transcripts yet</p>
                  <p className="text-white/15 text-sm mt-2">
                    Go to Studio and analyze audio to create transcripts
                  </p>
                  <GradBtn onClick={() => setView("studio")} className="mt-6 mx-auto">
                    <Zap className="w-4 h-4" /> Open Studio
                  </GradBtn>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {history.map((item, i) => (
                      <HistoryCard
                        key={item.id}
                        item={item}
                        index={i}
                        onDelete={() =>
                          saveHistory(history.filter((h) => h.id !== item.id))
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.6); }
      `}</style>
    </div>
  );
}
