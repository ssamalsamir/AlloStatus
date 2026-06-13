import { streamText, type LanguageModel, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getViewer } from "@/lib/session";
import { loadAnalysis } from "@/lib/data";
import { buildChatSystemPrompt } from "@/lib/chat/context";

// Gemini, two ways. If a key is set we call Google directly; otherwise, if the
// project has Vercel AI Gateway access (an OIDC token or gateway key), we route
// the same Gemini model through the gateway — no separate key needed. With
// neither, the route still responds with a note, so the app keeps working
// credential-free like the rest of AlloStatus.
const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const hasGateway = !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function resolveModel(): LanguageModel | null {
  if (apiKey) return createGoogleGenerativeAI({ apiKey })(MODEL);
  if (hasGateway) return `google/${MODEL}`; // routed through the Vercel AI Gateway
  return null;
}

const plain = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(request: Request): Promise<Response> {
  const { messages, seed } = (await request.json().catch(() => ({}))) as {
    messages?: unknown;
    seed?: unknown;
  };
  if (!Array.isArray(messages)) return plain("Bad request", 400);

  const model = resolveModel();
  if (!model) {
    return plain(
      "I need Gemini access to talk through your reading — set GEMINI_API_KEY, or enable the Vercel AI Gateway. Everything else in AlloStatus works without it.",
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

  const result = streamText({
    model,
    system: buildChatSystemPrompt(analysis, { isDemo: !signedIn }),
    messages: history,
    temperature: 0.6,
  });

  return result.toTextStreamResponse();
}
