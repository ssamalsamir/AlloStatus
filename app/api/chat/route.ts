import { streamText, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getViewer } from "@/lib/session";
import { loadAnalysis } from "@/lib/data";
import { buildChatSystemPrompt } from "@/lib/chat/context";

// Direct Gemini wiring via a key (GEMINI_API_KEY). If it's absent the route still
// responds — with a note on how to enable it — so the app keeps working without
// any AI credentials, the same way the rest of AlloStatus does.
const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const plain = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(request: Request): Promise<Response> {
  const { messages, seed } = (await request.json().catch(() => ({}))) as {
    messages?: unknown;
    seed?: unknown;
  };
  if (!Array.isArray(messages)) return plain("Bad request", 400);

  if (!apiKey) {
    return plain(
      "I need a Gemini API key to talk through your reading — add GEMINI_API_KEY to the environment and I'll come alive. Everything else in AlloStatus works without it.",
    );
  }

  // Keep only well-formed turns, and a recent window of them.
  const history = messages
    .filter(
      (m): m is ModelMessage =>
        !!m &&
        typeof (m as ModelMessage).content === "string" &&
        ((m as ModelMessage).role === "user" || (m as ModelMessage).role === "assistant"),
    )
    .slice(-12);
  if (history.length === 0) return plain("Say something to get started.", 400);

  const viewer = await getViewer();
  const signedIn = !!viewer && !viewer.isDemo;
  const analysis = await loadAnalysis(
    viewer,
    signedIn ? undefined : typeof seed === "number" ? seed : undefined,
  );

  const google = createGoogleGenerativeAI({ apiKey });
  const result = streamText({
    model: google(MODEL),
    system: buildChatSystemPrompt(analysis, { isDemo: !signedIn }),
    messages: history,
    temperature: 0.6,
  });

  return result.toTextStreamResponse();
}
