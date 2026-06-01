import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

// Initialize the Google GenAI SDK using process.env.GEMINI_API_KEY
// Ensure User-Agent is set to 'aistudio-build' for tracking
const getGenAI = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Gemini API calls will fail.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to support base64 snapshot images from the whiteboard canvas
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // POST /api/challenge: Send the whiteboard elements + settings to Gemini for Devil's Advocate evaluation
  app.post("/api/challenge", async (req, res) => {
    try {
      const {
        topic = "",
        role = "",
        notes = "",
        whiteboardSummary = "",
        mode = "normal", // 'normal' | 'strong' | 'socratic'
        image = "" // Base64 png data url
      } = req.body;

      // Make the default settings Western Civilization from 10,000 BCE to 1989 CE
      const courseName = "Western Civilization (10,000 BCE to 1989 CE)";
      const discipline = "Historical Analysis, Causality & Argumentation";
      const challengeTone = "Respectful, Skeptical Academic Devil's Advocate";
      const numQuestions = 3;

      // Construct a tailored system instruction prompt
      let systemInstruction = `You are an elite, extremely precise, and respectful Devil's Advocate for a college classroom. 
Your target audience is college history or humanities students.
Current Course Context: Course Name "${courseName}", and Discipline style is "${discipline}".
Tone: ${challengeTone} (concise, respectful, intellectually serious, never patronizing, never insulting, never praise-heavy or overly flowery).

You must help the student evaluate their argumentation, source quality, chronology, and causality.

CRITICAL HYPERLINK REQUIREMENT: Whenever you suggest looking at alternative arguments, counterarguments, or checking alternative evidence, you MUST provide active, useful markdown hyperlinks to reputable educational sources or specific query links using standard absolute URLs (e.g., [Britannica: Topic Name](https://www.britannica.com/...) or [World History Encyclopedia: Topic Name](https://www.worldhistory.org/...) or search queries like [Google Scholar: Topic Query](https://scholar.google.com/scholar?q=...) or [Wikipedia: Topic Name](https://en.wikipedia.org/wiki/...)). Ensure standard anchor text is descriptive and links are properly encapsulated, e.g. [Anchor text](url).

STRICT RESPONSE STRUCTURE PREFERENCE (Deliver response in clear Markdown with exactly these sections):
`;

      if (mode === "socratic") {
        systemInstruction += `
MODE: SOCRATIC DIALOGUE (Speak ONLY in questions to guide student reflection). 
Do NOT make direct claims or assertions. All points must be framed as constructive, deep academic queries.
Your markdown output must consist of these 4 exact headings:

### 1. Socratic Mirroring
Acknowledge what they are arguing *purely by asking an elegant mirror question* (e.g., "Am I understanding correctly that the core causal link you see is...?").

### 2. Scholarly Inquiries
Provide exactly ${numQuestions} targeted, deeply academic questions concerning: logical/causal relationships, potential bias, timeline issues, or missing variables based on their topic, diagram snapshot, or notes.

### 3. Path to Revision
A key guiding question formatted to inspire revision of their diagram or claim. Include suggested hyperlinks if guiding to alternative perspectives.

### 4. Empirical Test
An optional hypothetical question starting with: "What potential historical evidence would completely alter your perspective here? Explore further perspectives here: [Google Scholar Search](https://scholar.google.com/scholar?q=${encodeURIComponent(topic || 'western civilization')})."`;
      } else if (mode === "strong") {
        systemInstruction += `
MODE: STRONGER CHALLENGE (Highly rigorous, direct, deeply skeptical critique of causal gaps and sources). 
Act as an intense, unyielding but polite academic peer reviewer.
Your markdown output must consist of these 4 exact headings:

### 1. Core Thesis Evaluation
One highly concise, direct sentence highlighting exactly what the student's board claims, and pointing out its principal structural vulnerability.

### 2. High-Rigour Challenges
List exactly ${numQuestions} direct, highly specific and unsparing critical observations or diagnostic questions challenging their causal links, chronological leaps, or interpretive biases.

### 3. Structural Strengthening
One concrete, actionable technical adjustment they can make to their whiteboard visual connections, notes, or source logic. Suggest a reputable alternative view or background reader link like: [Britannica Search](https://www.britannica.com/search?query=${encodeURIComponent(topic || 'history')}).

### 4. Refutation Standard
A clear challenge detailing: "What evidence category, if found by a rival researcher, would render this position untenable?" Provide suggested query links if possible with search queries for alternative theories.`;
      } else {
        // mode === 'normal' (Balanced Critique)
        systemInstruction += `
MODE: NORMAL DEVIL'S ADVOCATE (Balanced, constructive critique). 
Review the argument as a friendly, sharp seminar classmate.
Your markdown output must consist of these 4 exact headings:

### 1. Acknowledgment
One concise sentence summarizing the student's argument elements, verifying their current hypothesis or whiteboard claim.

### 2. Targeted Critical Questions
Provide exactly ${numQuestions} focused questions probing the student's causal assertions, source reliability, or missing chronological steps.

### 3. Actionable Revision Suggestion
Exactly 1 major constructive suggestion for strengthening the diagram's logic, adding sources, or clarifying connections. When suggesting alternative viewpoints, provide appropriate reference links (e.g., [World History Encyclopedia](https://www.worldhistory.org/) or [Google Scholar](https://scholar.google.com/scholar?q=${encodeURIComponent(topic || 'history')})).

### 4. Focus Question
A prompt challenging them with: "What kind of evidence would change my mind on this exact point?"`;
      }

      // Prepare Gemini Parts
      const contentsParts: any[] = [];

      // Add Whiteboard Drawing Image if provided
      if (image && image.includes("base64,")) {
        try {
          const parts = image.split("base64,");
          const mimePart = parts[0];
          const rawMime = mimePart.match(/data:([^;]+);/);
          const mimeType = rawMime ? rawMime[1] : "image/png";
          const base64Data = parts[1];

          contentsParts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        } catch (imgErr) {
          console.error("Error processing base64 image data:", imgErr);
        }
      }

      // Build User Prompt String
      let userPrompt = `Student argument topic/claim is: "${topic}"\n`;
      if (role) {
        userPrompt += `Historical Role/Perspective assumed by student: "${role}"\n`;
      }
      if (notes) {
        userPrompt += `Evidence & source notes typed by student:\n${notes}\n`;
      }
      if (whiteboardSummary) {
        userPrompt += `Plain-text whiteboard summary written by student:\n${whiteboardSummary}\n`;
      }
      userPrompt += `\nPlease review the attached canvas drawing (if any is drawn) and the text information above, and deliver your feedback formatted exactly as instructed. Keep your sentences sharp, dense, clear, and academically robust.`;

      contentsParts.push({
        text: userPrompt
      });

      // Call the Gemini API server-side using the correct SDK and model: gemini-3.5-flash
      const aiClient = getGenAI();
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: contentsParts },
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      // Deliver the text generated from the API response
      res.json({
        success: true,
        feedback: response.text || "AI completed generation but returned no text elements."
      });

    } catch (err: any) {
      console.error("Error in POST /api/challenge:", err);
      res.status(500).json({
        success: false,
        error: err.message || "An error occurred inside the Gemini application challenge route."
      });
    }
  });

  // POST /api/reflection-summary: Side-by-side reflection helper
  app.post("/api/reflection-summary", async (req, res) => {
    try {
      const {
        originalTopic = "",
        originalNotes = "",
        instructorFeedback = "",
        reflectionText = ""
      } = req.body;

      const aiClient = getGenAI();

      const systemInstruction = `You are a respectful writing counselor and humanities instructor. Your task is to review a student's progress from their original claims, through the critique received, to their reflection. Write a encouraging, highly insightful Side-by-Side Reflection Summary verifying if they addressed the primary challenges of causality, source evaluation, and biased assumptions. Keep it concise, professional, and readable inside a 2-column or bulleted layout. Do not extend beyond 200 words.`;

      const prompt = `
Original Student Topic/Notes:
${originalTopic}
${originalNotes}

Devil's Advocate Feedback Received:
${instructorFeedback}

Student's Revision/Reflection Statement:
"${reflectionText}"

Please synthesize their intellectual growth. What did they successfully refine? What should they focus on next? Write a scholarly, helpful response.`;

      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.6,
        }
      });

      res.json({
        success: true,
        summary: response.text || "No reflection summary was generated."
      });

    } catch (err: any) {
      console.error("Error in /api/reflection-summary:", err);
      res.status(500).json({
        success: false,
        error: err.message || "An error occurred inside the reflection synthesizer."
      });
    }
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite local middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static build hosting");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server successfully initialized on port ${PORT}`);
  });
}

startServer();
