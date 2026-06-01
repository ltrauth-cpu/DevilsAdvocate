import React, { useRef, useState, useEffect } from "react";
import { Pen, Eraser, Plus, Trash2, RotateCcw, Download } from "lucide-react";
import { StickyNote } from "../types";

interface WhiteboardProps {
  stickyNotes: StickyNote[];
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNote[]>>;
  theme: "light" | "dark";
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCaptureRef: React.MutableRefObject<(() => string) | null>;
}

export default function Whiteboard({
  stickyNotes,
  setStickyNotes,
  theme,
  canvasRef,
  onCaptureRef
}: WhiteboardProps) {
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState<string>("#1e1e24"); // Off-black default scholar ink
  const [lineWidth, setLineWidth] = useState<number>(4);

  // Active sticky details
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Scholars Ink choices
  const inkColors = [
    { name: "Slate Charcoal", value: "#1e1e24" },
    { name: "Academic Blue", value: "#1d4ed8" },
    { name: "Skeptic Red", value: "#be123c" },
    { name: "Forest Context", value: "#15803d" },
    { name: "Amber Highlight", value: "#b45309" }
  ];

  // Adjust default ink color when theme changes
  useEffect(() => {
    if (theme === "dark") {
      setColor("#f3f4f6"); // Off-white ink for dark board
    } else {
      setColor("#1e1e24"); // Dark ink for light board
    }
  }, [theme]);

  // Initialization: Draw grid background to canvas once on load
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standard high resolution size internal
    canvas.width = 1500;
    canvas.height = 1000;

    // Clear and draw parchment structure
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawGridPattern(ctx, canvas.width, canvas.height);
  }, [canvasRef]);

  // Clears and draws background grid patterns on target context
  const drawGridPattern = (ctx: CanvasRenderingContext2D, width: number, height: number, customTheme = theme) => {
    ctx.fillStyle = customTheme === "dark" ? "#111827" : "#faf9f6";
    ctx.fillRect(0, 0, width, height);

    // Grid dots
    ctx.fillStyle = customTheme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
    const gap = 20;
    for (let x = gap; x < width; x += gap) {
      for (let y = gap; y < height; y += gap) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  // Re-draw grid on theme changes (preserving any existing drawings)
  // To avoid erasing standard canvas sketches when toggled, we can create an offscreen backup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create backup offscreen
    const backup = document.createElement("canvas");
    backup.width = canvas.width;
    backup.height = canvas.height;
    const backupCtx = backup.getContext("2d");
    if (backupCtx) {
      backupCtx.drawImage(canvas, 0, 0);
    }

    // Draw background
    drawGridPattern(ctx, canvas.width, canvas.height);

    // Draw backup on top with a tiny compositing adjustment if needed
    // However, to make sketches visible on dark canvas, we invert charcoal ink to white on the fly, or just copy it.
    // Let's simply copy back existing drawing. The user can see their strokes.
    ctx.drawImage(backup, 0, 0);
  }, [theme, canvasRef]);

  // Whiteboard drawing event handlers support desktop mouse + mobile tablet pointer
  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale pointer to canvas internal coordinates (1000 x 600)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);

    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPointerPos(e);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = tool === "eraser" 
      ? (theme === "dark" ? "#111827" : "#faf9f6") 
      : color;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId);
      }
      setIsDrawing(false);
    }
  };

  // Erases the entire whiteboard
  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawGridPattern(ctx, canvas.width, canvas.height);
    setStickyNotes([]);
  };

  // Adds a sticky note
  const addStickyNote = () => {
    const defaultText = "Double click to write custom historical source, evidence connection or assertion.";
    const stickyColors = ["#fef08a", "#bae6fd", "#bbf7d0", "#fed7aa", "#f5d0fe"];
    const randomColor = stickyColors[stickyNotes.length % stickyColors.length];

    const newNote: StickyNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9),
      text: defaultText,
      // Position offset based on existing notes to avoid complete overlapping
      x: 100 + (stickyNotes.length * 30) % 300,
      y: 100 + (stickyNotes.length * 30) % 200,
      color: randomColor
    };
    setStickyNotes(prev => [...prev, newNote]);
  };

  // Draggable Sticky Handling via Pointers
  const handleStickyPointerDown = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    // Avoid triggering drag if student is editing
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "BUTTON") {
      return;
    }
    e.preventDefault();
    setActiveNoteId(id);
    const targetNote = stickyNotes.find(n => n.id === id);
    if (!targetNote) return;

    // Use current note coords and pointer positions
    dragOffset.current = {
      x: e.clientX - targetNote.x,
      y: e.clientY - targetNote.y
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handleStickyPointerMove = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (activeNoteId !== id) return;
    e.preventDefault();

    const parent = containerRef.current;
    if (!parent) return;

    const nextX = e.clientX - dragOffset.current.x;
    const nextY = e.clientY - dragOffset.current.y;

    // Boundary constraints within whiteboard absolute size (1500 x 1000)
    const noteWidth = 210;
    const noteHeight = 150;
    const clampedX = Math.max(0, Math.min(nextX, 1500 - noteWidth));
    const clampedY = Math.max(0, Math.min(nextY, 1000 - noteHeight));

    setStickyNotes(prev =>
      prev.map(note => (note.id === id ? { ...note, x: clampedX, y: clampedY } : note))
    );
  };

  const handleStickyPointerUp = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (activeNoteId === id) {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      setActiveNoteId(null);
    }
  };

  const handleStickyChange = (id: string, text: string) => {
    setStickyNotes(prev =>
      prev.map(note => (note.id === id ? { ...note, text } : note))
    );
  };

  const deleteSticky = (id: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
  };

  // Burns sticky notes onto a duplicate canvas and returns combined base64 image data url
  const captureCombinedBoard = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const parent = containerRef.current;
    if (!parent) return "";

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return "";

    // Copy current visual state
    tempCtx.drawImage(canvas, 0, 0);

    // Calculate size scaling factors relative to visible workspace bounds to draw stickies
    const scaleX = 1;
    const scaleY = 1;

    // Draw active stickies directly onto combined snapshot
    stickyNotes.forEach(note => {
      const x = note.x * scaleX;
      const y = note.y * scaleY;
      const w = 210 * scaleX; // Scaled note dimensions approx
      const h = 150 * scaleY;
      const r = 8 * scaleX;   // Rounded corner radius

      // Shadow overlay
      tempCtx.fillStyle = "rgba(0, 0, 0, 0.15)";
      tempCtx.beginPath();
      tempCtx.roundRect(x + 4, y + 4, w, h, r);
      tempCtx.fill();

      // Note background fill (hex representation of sticky yellow/blue etc)
      tempCtx.fillStyle = note.color;
      tempCtx.beginPath();
      tempCtx.roundRect(x, y, w, h, r);
      tempCtx.fill();

      // Border outline
      tempCtx.strokeStyle = "rgba(0,0,0,0.15)";
      tempCtx.lineWidth = 1.5 * scaleX;
      tempCtx.stroke();

      // Simple Text Wrapping & Render helper
      tempCtx.fillStyle = "#1e293b"; // Charcoal text color
      const fontSize = Math.floor(13 * scaleX);
      tempCtx.font = `${fontSize}px Georgia, serif`;
      
      const textPadding = 12 * scaleX;
      const maxTextWidth = w - (textPadding * 2);
      const lineHeight = fontSize * 1.35;
      
      // Split text by white space and render
      const words = note.text.split(" ");
      let line = "";
      let currentY = y + textPadding + fontSize;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = tempCtx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxTextWidth && n > 0) {
          tempCtx.fillText(line, x + textPadding, currentY);
          line = words[n] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
        
        // Prevent drawing outside sticky boundary lines
        if (currentY > y + h - textPadding) break;
      }
      
      if (currentY <= y + h - textPadding) {
        tempCtx.fillText(line, x + textPadding, currentY);
      }
    });

    return tempCanvas.toDataURL("image/png");
  };

  // Expose capture function to parent component via ref assignment
  useEffect(() => {
    onCaptureRef.current = captureCombinedBoard;
  }, [stickyNotes, theme]);

  // Exports whiteboard PNG directly to user's local disk
  const exportAsPngFile = () => {
    const dataUrl = captureCombinedBoard();
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.download = `whiteboard-argument-${new Date().toISOString().split("T")[0]}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div id="whiteboard-workspace" className="flex flex-col gap-3">
      {/* Visual Whiteboard Toolbar */}
      <div 
        role="toolbar" 
        aria-label="Whiteboard controls"
        className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Tool selectors */}
          <button
            onClick={() => setTool("pen")}
            aria-label="Draw path tool"
            id="toolbar-pen-btn"
            className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold tracking-wide border transition-all ${
              tool === "pen"
                ? "bg-slate-900 border-slate-900 text-white dark:bg-blue-600 dark:border-blue-700"
                : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100"
            }`}
          >
            <Pen size={14} />
            <span>Pen</span>
          </button>

          <button
            onClick={() => setTool("eraser")}
            aria-label="Eraser tool"
            id="toolbar-eraser-btn"
            className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold tracking-wide border transition-all ${
              tool === "eraser"
                ? "bg-slate-900 border-slate-900 text-white dark:bg-blue-600 dark:border-blue-700"
                : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100"
            }`}
          >
            <Eraser size={14} />
            <span>Eraser</span>
          </button>

          {/* Sizing dropdown selector */}
          <div className="flex items-center gap-1.5 mx-1">
            <span id="brush-size-label" className="text-xs font-medium text-slate-500 dark:text-slate-400">Stroke:</span>
            <select
              aria-labelledby="brush-size-label"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value, 10))}
              id="toolbar-width-select"
              className="text-xs p-1.5 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold focus:outline-none"
            >
              <option value="2">Fine (2px)</option>
              <option value="4">Default (4px)</option>
              <option value="8">Medium (8px)</option>
              <option value="12">Broad (12px)</option>
            </select>
          </div>

          {/* Color Palette (Disabled if in eraser mode) */}
          {tool === "pen" && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 p-1.5 rounded-lg border border-slate-100 dark:border-slate-600">
              {inkColors.map((ink) => (
                <button
                  key={ink.value}
                  onClick={() => setColor(ink.value)}
                  title={ink.name}
                  aria-label={`Ink color: ${ink.name}`}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    color === ink.value ? "scale-125 border-slate-900 dark:border-white ring-2 ring-blue-500/30" : "border-transparent"
                  }`}
                  style={{ backgroundColor: ink.value }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Global Operations */}
        <div className="flex items-center gap-2">
          <button
            onClick={addStickyNote}
            aria-label="Add sticky card note"
            id="toolbar-add-sticky-btn"
            className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-slate-600 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all"
          >
            <Plus size={14} />
            <span>Add Text Card</span>
          </button>

          <button
            onClick={clearBoard}
            aria-label="Clear whiteboard elements"
            id="toolbar-clear-btn"
            className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all"
          >
            <RotateCcw size={14} />
            <span>Clear board</span>
          </button>

          <button
            onClick={exportAsPngFile}
            title="Download whiteboard diagram snapshot as PNG"
            aria-label="Download board snapshot"
            id="toolbar-export-btn"
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all"
          >
            <Download size={14} />
            <span>Save PNG</span>
          </button>
        </div>
      </div>

      {/* Main Relative Interactive Board Workspace */}
      <div
        id="whiteboard-scroll-viewport"
        className="w-full h-[650px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative bg-stone-50/50 dark:bg-slate-900 scrollbar-thin"
      >
        <div
          ref={containerRef}
          id="whiteboard-canvas-container"
          className="relative shadow-inner"
          style={{ width: "1500px", height: "1000px" }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            style={{ touchAction: "none" }}
          />

          {/* Drag-and-drop overlay stickies */}
          {stickyNotes.map((note) => (
            <div
              key={note.id}
              onPointerDown={(e) => handleStickyPointerDown(note.id, e)}
              onPointerMove={(e) => handleStickyPointerMove(note.id, e)}
              onPointerUp={(e) => handleStickyPointerUp(note.id, e)}
              id={`sticky-${note.id}`}
              style={{
                position: "absolute",
                left: `${note.x}px`,
                top: `${note.y}px`,
                width: "210px",
                height: "150px",
                backgroundColor: note.color,
                touchAction: "none"
              }}
              className="rounded-lg shadow-md border border-black/10 p-3 flex flex-col group select-none transition-shadow duration-150 hover:shadow-lg active:shadow-xl cursor-grab active:cursor-grabbing text-slate-800"
            >
              {/* Note handle panel */}
              <div className="flex items-center justify-between border-b border-black/5 pb-1 mb-1.5 shrink-0">
                <span className="text-[10px] font-mono tracking-wider text-slate-500 font-semibold uppercase">Assertion card</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSticky(note.id);
                  }}
                  aria-label="Delete text note"
                  className="opacity-40 group-hover:opacity-100 hover:text-red-600 p-0.5 rounded transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Editable note area */}
              <textarea
                value={note.text}
                onChange={(e) => handleStickyChange(note.id, e.target.value)}
                placeholder="Type argument notes..."
                className="resize-none w-full h-full bg-transparent border-none text-xs text-slate-800 outline-none leading-relaxed font-serif"
                onPointerDown={(e) => e.stopPropagation()} // Prevents dragging on cursor select text
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
