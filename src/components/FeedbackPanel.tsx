import React from "react";
import { Download, Sparkles, BookOpen, AlertCircle, RefreshCw } from "lucide-react";

interface FeedbackPanelProps {
  feedback: string;
  loading: boolean;
  selectedMode: string;
  onClear: () => void;
  topic: string;
}

export default function FeedbackPanel({
  feedback,
  loading,
  selectedMode,
  onClear,
  topic
}: FeedbackPanelProps) {

  // A lightweight, highly robust regex-based Markdown cleaner and renderer to guarantee seamless HTML presentation
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    // Split text into paragraphs/lines
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Headings (e.g., ### 1. Status)
      if (trimmed.startsWith("###")) {
        const hText = trimmed.replace(/^###\s*/, "");
        return (
          <h3 key={idx} className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100 uppercase mt-4 mb-2 first:mt-1 border-b border-slate-100 dark:border-slate-800 pb-1">
            {hText}
          </h3>
        );
      }
      if (trimmed.startsWith("##")) {
        const hText = trimmed.replace(/^##\s*/, "");
        return (
          <h2 key={idx} className="text-base font-bold tracking-tight text-slate-900 dark:text-white mt-5 mb-2">
            {hText}
          </h2>
        );
      }
      if (trimmed.startsWith("#")) {
        const hText = trimmed.replace(/^#\s*/, "");
        return (
          <h1 key={idx} className="text-lg font-extrabold text-slate-950 dark:text-white mt-6 mb-3">
            {hText}
          </h1>
        );
      }

      // Bullet items (e.g., - Question or * Question)
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const bulletText = trimmed.replace(/^[-*]\s*/, "");
        return (
          <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 ml-4 list-disc pl-1 mb-1.5 font-serif leading-relaxed">
            {formatInlineStyling(bulletText)}
          </li>
        );
      }

      // Default numbered list item (e.g. 1. Question)
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 ml-5 list-decimal pl-1 mb-1.5 font-serif leading-relaxed">
            {formatInlineStyling(numMatch[2])}
          </li>
        );
      }

      // Empty spaces
      if (trimmed === "") {
        return <div key={idx} className="h-2" />;
      }

      // Default paragraph text helper
      return (
        <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 mb-2 leading-relaxed font-serif">
          {formatInlineStyling(trimmed)}
        </p>
      );
    });
  };

  // Helper to convert **text** and [anchor](url) to interactive elements
  const formatInlineStyling = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("[") && part.endsWith(")") && part.includes("](")) {
        const urlIndex = part.indexOf("](");
        const anchor = part.slice(1, urlIndex);
        const url = part.slice(urlIndex + 2, -1);
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
          >
            {anchor}
          </a>
        );
      }
      return part;
    });
  };

  // Exporters plain feedback as text
  const exportFeedbackText = () => {
    if (!feedback) return;
    const blob = new Blob([
      `DEVIL'S ADVOCATE CRITIQUE LOG\n`,
      `Topic/Thesis Claim: ${topic || "Not Specified"}\n`,
      `Challenge Mode: ${selectedMode ? selectedMode.toUpperCase() : "NORMAL"}\n`,
      `Date Generated: ${new Date().toLocaleString()}\n`,
      `===========================================\n\n`,
      feedback
    ], { type: "text/plain;charset=utf-8" });

    const link = document.createElement("a");
    link.download = `critique-feedback-${new Date().toISOString().split("T")[0]}.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-stone-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="text-slate-600 dark:text-slate-400" size={16} />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            AI Critique Feed
          </h2>
          {selectedMode && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider font-mono ${
              selectedMode === "socratic" 
                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800" 
                : selectedMode === "strong"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}>
              {selectedMode} Mode
            </span>
          )}
        </div>

        {feedback && !loading && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportFeedbackText}
              title="Save critique feedback session to disk"
              id="export-feedback-btn"
              className="p-1 px-2.5 rounded-md text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 bg-white dark:bg-slate-800 transition-all"
            >
              <Download size={10} />
              <span>Save Log</span>
            </button>
            <button
              onClick={onClear}
              id="clear-feedback-btn"
              className="text-[10px] hover:text-red-500 text-slate-400 font-semibold uppercase font-mono"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Main feedback text container */}
      <div id="ai-response-scroller" className="flex-1 overflow-y-auto max-h-[460px] pr-1.5 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="relative flex items-center justify-center">
              <RefreshCw className="animate-spin text-blue-600 dark:text-blue-400" size={28} />
              <Sparkles className="absolute text-amber-500 animate-pulse" size={14} style={{ right: -6, top: -6 }} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Analyzing whiteboard and thesis...</p>
              <p className="text-[10px] text-slate-400 italic max-w-xs leading-normal">
                "The Devil's Advocate is evaluating logic, searching for silent causal leaps, and crafting targeted inquiries."
              </p>
            </div>
          </div>
        ) : feedback ? (
          <div className="space-y-4 text-left">
            <div className="prose prose-sm dark:prose-invert">
              {renderMarkdown(feedback)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-600 gap-2.5">
            <AlertCircle size={24} className="stroke-slate-300 dark:stroke-slate-700" />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Whiteboard Evaluation Idle</p>
              <p className="text-[10px] max-w-xs leading-relaxed text-slate-400 dark:text-slate-500">
                Type your topic claim, draw key causal elements on the board, and press an interrogation mode button to start.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
