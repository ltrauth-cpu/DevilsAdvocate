import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  Settings2, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Sun, 
  Moon, 
  MessageSquare, 
  Lightbulb, 
  FileText, 
  CheckCircle,
  FolderSync
} from "lucide-react";
import { StickyNote, FeedbackLog } from "./types";
import Whiteboard from "./components/Whiteboard";
import FeedbackPanel from "./components/FeedbackPanel";

export default function App() {
  // Appearance & Core State
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Student Input States (Starting blank as requested for student autonomy)
  const [topic, setTopic] = useState<string>("");
  const [role, setRole] = useState<string>("Historical Analysis");
  const [notes, setNotes] = useState<string>("");
  const [boardSummary, setBoardSummary] = useState<string>("");

  // Whiteboard sticky notes state (Starting with a clear board as requested)
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

  // Pre-population helper for students to load a pre-built argument
  const loadSampleCaseStudy = () => {
    setTopic("The Rise of Parliamentary Sovereignty during the Glorious Revolution of 1688");
    setRole("Constitutional Historiography");
    setNotes("Claim: The bloodless coup of 1688 established immediate parliamentary supremacy over royal prerogative.\nSources: Bill of Rights (1689), John Locke's Second Treatise, and historical criticisms of aristocratic opportunism.");
    setBoardSummary("Visual board maps the shift of power from King James II to Parliament with William & Mary at the apex.");
    setStickyNotes([
      {
        id: "demo-1",
        text: "Level 1 (Core Thesis): The 1689 Bill of Rights legally bound monarchical power, establishing parliamentary supremacy.",
        x: 100,
        y: 60,
        color: "#fef08a"
      },
      {
        id: "demo-2",
        text: "Level 2 (Supporting Evidence): Parliament gained definitive control over the standing army, royal budget allocation, and taxation rules.",
        x: 100,
        y: 360,
        color: "#bae6fd"
      },
      {
        id: "demo-3",
        text: "Level 3 (Counter-view / Sizable Blindspot): The settlement consolidated aristocratic oligarchy dominance over royal tyranny, rather than representing a popular democratic victory.",
        x: 100,
        y: 680,
        color: "#fca5a5"
      }
    ]);
  };

  // Full fields and visual canvas resetting helper
  const resetAllFieldsFully = () => {
    setTopic("");
    setNotes("");
    setBoardSummary("");
    setStickyNotes([]);
    setFeedback("");
    setReflectionText("");
    setBeforeAfterReport("");
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        // Redraw parchment/canvas internal grid pattern
        ctx.fillStyle = theme === "dark" ? "#111827" : "#faf9f6";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        // Grid dots back on
        ctx.fillStyle = theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
        const gap = 20;
        for (let x = gap; x < canvasRef.current.width; x += gap) {
          for (let y = gap; y < canvasRef.current.height; y += gap) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    }
  };

  // AI Critique and Reflection Engine States
  const [feedback, setFeedback] = useState<string>("");
  const [loadingCritique, setLoadingCritique] = useState<boolean>(false);
  const [challengeMode, setChallengeMode] = useState<"normal" | "strong" | "socratic">("normal");

  // Before/After Revision and Reflection State
  const [reflectionText, setReflectionText] = useState<string>("");
  const [beforeAfterReport, setBeforeAfterReport] = useState<string>("");
  const [loadingReflection, setLoadingReflection] = useState<boolean>(false);

  // Ref hooks to capture whiteboard canvas base64 accurately
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCombinedBoardRef = useRef<(() => string) | null>(null);

  // Sync class name for Theme Toggle
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Submit topic details and snapshot image to Gemini backend
  const handleAIEvaluation = async (mode: "normal" | "strong" | "socratic") => {
    setChallengeMode(mode);
    setLoadingCritique(true);
    setFeedback("");

    // Read combined base64 layout from canvas if ref exists
    let drawingDataUrl = "";
    if (captureCombinedBoardRef.current) {
      try {
        drawingDataUrl = captureCombinedBoardRef.current();
      } catch (err) {
        console.error("Could not capture whiteboard layout:", err);
      }
    }

    try {
      const response = await fetch("/api/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic,
          role,
          notes,
          whiteboardSummary: boardSummary,
          mode,
          image: drawingDataUrl
        })
      });

      const data = await response.json();
      if (data.success) {
        setFeedback(data.feedback);
      } else {
        setFeedback(`### Error in Interrogation\nCould not receive analytical feedback: ${data.error || "Unknown response error."}`);
      }
    } catch (err: any) {
      console.error(err);
      setFeedback(`### Critical Offline Error\nCould not reach the server endpoint to test your arguments. Please verify standard container configurations. ${err.message || ""}`);
    } finally {
      setLoadingCritique(false);
    }
  };

  // Submit Student Revision & Reflective Growth
  const handleGenerateReflectionSummary = async () => {
    if (!reflectionText.trim()) {
      alert("Please enter a short statement describing what you learned/changed in the revision reflection box.");
      return;
    }
    setLoadingReflection(true);
    setBeforeAfterReport("");

    try {
      const response = await fetch("/api/reflection-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          originalTopic: topic,
          originalNotes: notes,
          instructorFeedback: feedback,
          reflectionText
        })
      });

      const data = await response.json();
      if (data.success) {
        setBeforeAfterReport(data.summary);
      } else {
        setBeforeAfterReport(`Error constructing reflection: ${data.error}`);
      }
    } catch (err: any) {
      console.error(err);
      setBeforeAfterReport(`Network anomaly prevents reflection assembly: ${err.message}`);
    } finally {
      setLoadingReflection(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#FDFCFB] text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      
      {/* Dynamic Scholarly App Header & Core Utility */}
      <header className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 dark:bg-blue-600 flex items-center justify-center rounded-lg shadow-sm">
            <span className="text-white font-serif font-extrabold text-lg">D</span>
          </div>
          <div>
            <h1 className="text-lg font-serif font-semibold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              Devil's Advocate Whiteboard
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">
              Debate Practice / Historiography & Humanities Lab
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-205 dark:border-slate-800">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Western Civilization (10,000 BCE to 1989 CE)</span>
          </div>

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle visual theme mode"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>



      {/* Main Core Full-Stack Split Area */}
      <main className="flex-1 flex flex-col lg:flex-row lg:min-h-0 bg-[#FBF9F6] dark:bg-slate-950 lg:overflow-hidden overflow-y-auto">
        
        {/* Left Side (60% Desktop bounds): Whiteboard Drawing Room */}
        <section aria-label="Interactive argument workspace sketcher" className="flex-1 flex flex-col p-4 md:p-6 border-r border-slate-200 dark:border-slate-800 bg-[#F9F8F6] dark:bg-slate-900/40 lg:h-full lg:overflow-y-auto pb-8">
          
          {/* Visual Header Panel */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h2 className="text-sm font-serif font-bold text-slate-800 dark:text-white">
                Interactive Argument Mapping Canvas
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                Plot your logical claims, connect primary sources, and sketch causative flows.
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded text-[11px] text-amber-800 dark:text-amber-300 font-semibold border border-amber-100 dark:border-amber-905/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Double click text cards to edit assertion wording</span>
            </div>
          </div>

          {/* Interactive Scholarly Flow Guidance Banner */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 mb-4 shadow-xs">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-2">
              <Sparkles size={13} className="text-amber-500" />
              <span>Humanties Research Flow & Onboarding Checklist</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className={`p-2.5 rounded-lg border transition-all ${topic.trim() ? "bg-emerald-50/40 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/40 dark:text-emerald-300" : "bg-white border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-400 dark:text-slate-500"}`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${topic.trim() ? "bg-emerald-500 text-white font-extrabold" : "border border-slate-350 text-slate-400"}`}>
                    {topic.trim() ? "✓" : "1"}
                  </span>
                  <span>1. Thesis Claim</span>
                </div>
                <p className="text-[10px] leading-relaxed opacity-85">Type your main core argument into the text box at the top of the board.</p>
              </div>

              <div className={`p-2.5 rounded-lg border transition-all ${stickyNotes.length > 0 ? "bg-emerald-50/40 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/40 dark:text-emerald-300" : "bg-white border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-400 dark:text-slate-500"}`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${stickyNotes.length > 0 ? "bg-emerald-500 text-white font-extrabold" : "border border-slate-350 text-slate-400"}`}>
                    {stickyNotes.length > 0 ? "✓" : "2"}
                  </span>
                  <span>2. Flow of Logic</span>
                </div>
                <p className="text-[10px] leading-relaxed opacity-85">Plot logic steps inside the whiteboard: add text cards & sketch causal links.</p>
              </div>

              <div className={`p-2.5 rounded-lg border transition-all ${notes.trim() ? "bg-emerald-50/40 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/40 dark:text-emerald-300" : "bg-white border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-400 dark:text-slate-500"}`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${notes.trim() ? "bg-emerald-500 text-white font-extrabold" : "border border-slate-350 text-slate-400"}`}>
                    {notes.trim() ? "✓" : "3"}
                  </span>
                  <span>3. Cited Evidence</span>
                </div>
                <p className="text-[10px] leading-relaxed opacity-85">Provide primary material & historical artifacts below the whiteboard.</p>
              </div>

              <div className={`p-2.5 rounded-lg border transition-all ${feedback.trim() ? "bg-emerald-50/40 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/40 dark:text-emerald-300" : "bg-white border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-400 dark:text-slate-500"}`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${feedback.trim() ? "bg-emerald-500 text-white font-extrabold" : "border border-slate-350 text-slate-400"}`}>
                    {feedback.trim() ? "✓" : "4"}
                  </span>
                  <span>4. Choose Challenge</span>
                </div>
                <p className="text-[10px] leading-relaxed opacity-85">Select your challenge level on the side panel to start the critique!</p>
              </div>
            </div>

            {/* Populate/Quick Reset controller bars */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              {stickyNotes.length === 0 && !topic.trim() ? (
                <>
                  <span>New to the lab? Pre-populate an academic case study template instantly to test:</span>
                  <button
                    onClick={loadSampleCaseStudy}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 rounded font-semibold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    🧪 Load Glorious Revolution Case Study
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[10px]">Your workspace states are active. Double click cards to rename, customize, and edit.</span>
                  <button
                    onClick={resetAllFieldsFully}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 rounded font-semibold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    ↺ Reset Board & Start Blank
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Thesis Statement Box - Styled prominently at the top of the board */}
          <div className="bg-amber-50/20 dark:bg-slate-900/60 p-4 rounded-xl border border-amber-550/20 dark:border-slate-800 mb-4 shadow-2xs">
            <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span>🎯 ENTER YOUR CORE THESIS CLAIM (TOP OF THE BOARD)</span>
            </label>
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. The bloodless coup of 1688 established permanent parliamentary sovereignty over royal prerogative by binding royal budget allocation and military power..."
              className="w-full text-xs font-serif p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-100 resize-none leading-relaxed"
            />
          </div>

          {/* Core Visual Whiteboard Component */}
          <div className="flex-1 mb-4">
            <Whiteboard
              stickyNotes={stickyNotes}
              setStickyNotes={setStickyNotes}
              theme={theme}
              canvasRef={canvasRef}
              onCaptureRef={captureCombinedBoardRef}
            />
          </div>

          {/* Sourcing Sizable Evidence Inputs - Now physically relocated BELOW the Whiteboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-blue-500" />
                  <span>Enter Supporting Evidence & Cited Materials</span>
                </label>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 leading-relaxed">
                  Detail what direct historical materials, primary texts, or references validate your flow of logic above.
                </p>
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Declare cited documents (e.g. Bill of Rights 1689, John Locke's writing, direct archives)..."
                className="w-full text-xs font-serif p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 resize-none leading-relaxed"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-500" />
                  <span>Whiteboard Diagram Snapshot Translation Summary</span>
                </label>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 leading-relaxed">
                  Briefly state or describe how visual connection logical steps flow across your whiteboard canvas.
                </p>
              </div>
              <textarea
                rows={4}
                value={boardSummary}
                onChange={(e) => setBoardSummary(e.target.value)}
                placeholder="Explain visually drawing links (e.g. arrows map displacement of royal privilege to crown constraints)..."
                className="w-full text-xs font-serif p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-750 dark:text-slate-200 resize-none leading-relaxed"
              />
            </div>
          </div>

        </section>

        {/* Right Side (40% Desktop bounds): Student controls, Argument Parameters, feedback logs, reflection box */}
        <section aria-label="Seminar Interrogation panel" className="w-full lg:w-[420px] xl:w-[480px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 md:p-6 flex flex-col gap-5 lg:h-full lg:overflow-y-auto pb-8">
          
          {/* Metadata parameters header */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>⚖️ ADVOCATE INTERROGATION PANEL</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4 bg-stone-50/50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                  Assumed Academic View
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Revisionist, Orthodox"
                  className="w-full text-xs font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-750 pb-1 bg-transparent focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col justify-end text-right">
                <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mb-1">Seminar Room</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Ready to Debate</span>
                </span>
              </div>
            </div>
          </div>

          {/* Prompt selecting level of challenge */}
          <div className="bg-amber-50/15 dark:bg-slate-900/50 border border-amber-200/50 dark:border-slate-800 p-4 rounded-xl space-y-3.5 shadow-3xs">
            <span className="block text-xs font-serif font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              🔥 SELECT THE LEVEL OF CHALLENGE
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Choose how rigorously the Devil's Advocate will stress-test your thesis claim, reasoning sequences, and material evidence:
            </p>
            
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => handleAIEvaluation("normal")}
                disabled={loadingCritique}
                className={`py-2.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                  challengeMode === "normal" && feedback
                    ? "bg-slate-900 border-slate-900 text-white dark:bg-blue-600 dark:border-blue-700 font-extrabold shadow-sm"
                    : "bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span>Normal Critique</span>
                  <span className="text-[9px] font-normal opacity-85">Constructive, analytical logic check of causes.</span>
                </div>
                <span className="translate-x-0 group-hover:translate-x-1 duration-150">➔</span>
              </button>
              
              <button
                onClick={() => handleAIEvaluation("strong")}
                disabled={loadingCritique}
                className={`py-2.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                  challengeMode === "strong" && feedback
                    ? "bg-red-950 border-red-900 text-white dark:bg-red-800 dark:border-red-900 font-extrabold shadow-sm"
                    : "bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span>Stronger Challenge</span>
                  <span className="text-[9px] font-normal opacity-85">Severe academic friction testing details & bias.</span>
                </div>
                <span className="translate-x-0 group-hover:translate-x-1 duration-150">➔</span>
              </button>

              <button
                onClick={() => handleAIEvaluation("socratic")}
                disabled={loadingCritique}
                className={`py-2.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                  challengeMode === "socratic" && feedback
                    ? "bg-amber-600 border-amber-600 text-white dark:bg-amber-700 dark:border-amber-800 font-extrabold shadow-sm"
                    : "bg-white hover:bg-slate-50 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span>Socratic Mode</span>
                  <span className="text-[9px] font-normal opacity-85">Probing queries into underlying logical assumptions.</span>
                </div>
                <span className="translate-x-0 group-hover:translate-x-1 duration-150">➔</span>
              </button>
            </div>

            {loadingCritique && (
              <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 animate-pulse text-center pt-2">
                Advocate is analyzing mapping snapshot & evidence links...
              </div>
            )}
          </div>

          {/* Section 3: AI Critique dynamic stream panel */}
          <div className="flex-1 min-h-[300px]">
            <FeedbackPanel
              feedback={feedback}
              loading={loadingCritique}
              selectedMode={challengeMode}
              onClear={() => setFeedback("")}
              topic={topic}
            />
          </div>

          {/* Section 4: Reflection Summary Generator */}
          {feedback && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-1 space-y-3 bg-stone-50/50 dark:bg-slate-900/30 p-3 rounded-xl border">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lightbulb size={12} className="text-amber-500" />
                  <span>Interactive Revision Reflection</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="What did you alter on the whiteboard, or how did your thesis state change in response to the critique?"
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  onClick={handleGenerateReflectionSummary}
                  disabled={loadingReflection}
                  className="text-[10px] text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <FolderSync size={11} className={loadingReflection ? "animate-spin" : ""} />
                  <span>Assemble Before/After Report</span>
                </button>
              </div>

              {/* Before After Synthesis Output */}
              {beforeAfterReport && (
                <div className="mt-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs text-left text-slate-700 dark:text-slate-300 shadow-xs max-h-[160px] overflow-y-auto leading-relaxed font-serif">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-2">
                    <CheckCircle className="text-emerald-500" size={13} />
                    <span className="font-sans font-bold text-[10px] text-slate-500 tracking-wider uppercase">Synthesized Progression Summary</span>
                  </div>
                  <p className="whitespace-pre-line text-[11px] leading-relaxed italic">{beforeAfterReport}</p>
                </div>
              )}
            </div>
          )}

        </section>

      </main>

      {/* Classic Scholarly Footer Context */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 px-6 py-2.5 flex flex-wrap items-center justify-between text-[11px] font-medium animate-fade-in">
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-slate-300">Course Syllabus Context: <strong className="text-white">Western Civilization (10,000 BCE to 1989 CE)</strong></span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="text-slate-300">Analytical Style: <strong className="text-white">Causative & Historiographical Advocacy</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
            <span className="font-mono text-[10px] uppercase">Review Focus: Alternatives & Suggested Links</span>
          </div>
          <span className="text-slate-600">Devil's Advocate v1.3</span>
        </div>
      </footer>

    </div>
  );
}
