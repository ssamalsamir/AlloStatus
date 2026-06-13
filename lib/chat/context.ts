import type { Analysis } from "@/lib/scoring";
import { scoreLabel } from "@/lib/colors";
import { formatFactorValue } from "@/lib/format";

// Turns a person's current reading into a system prompt so the chatbot is
// actually personalized — it can talk about *their* buffer, *their* depleting
// factors, and *their* trend, instead of giving generic wellness platitudes.

function trendWord(a: Analysis): string {
  const t = a.trend;
  if (t.length < 8) return "there isn't enough history yet to call a trend";
  const half = Math.floor(t.length / 2);
  const avg = (xs: { bufferPct: number }[]) =>
    xs.reduce((s, p) => s + p.bufferPct, 0) / xs.length;
  const delta = avg(t.slice(half)) - avg(t.slice(0, half));
  if (delta > 6) return "the buffer has been trending up over the past few weeks";
  if (delta < -6) return "the buffer has been trending down over the past few weeks";
  return "the buffer has been roughly flat over the past few weeks";
}

export function buildChatSystemPrompt(a: Analysis, opts: { isDemo: boolean }): string {
  const today = a.today;
  const factorLines = today.factors
    .map((f) => {
      const standing = !f.present
        ? "no reading today"
        : f.goodnessZ >= 0.4
          ? "above their own norm"
          : f.goodnessZ <= -0.4
            ? "below their own norm"
            : "about their own norm";
      return `- ${f.label}: ${formatFactorValue(f.key, f.value)} (${standing})`;
    })
    .join("\n");

  const depletors = today.depletors.length
    ? today.depletors
        .map((d, i) => `${i + 1}. ${d.label} (${d.severity}) — ${d.nudge}`)
        .join("\n")
    : "Nothing is notably dragging the buffer down today.";

  const best = a.best30 ? `${Math.round(a.best30.bufferPct)}/100` : "not established yet";

  return [
    "You are the AlloStatus guide: a calm, warm, plain-spoken companion that helps someone make sense of their daily resilience buffer and what's quietly draining it.",
    "",
    "How to respond:",
    "- Ground every answer in the reading below — reference their actual numbers and factors, not generic advice.",
    "- Be brief and human: a few short sentences, conversational, no bullet-point lectures unless asked.",
    "- Suggest small, concrete, doable things; never prescribe or diagnose.",
    "- You are not a clinician and this is not medical advice. If they mention self-harm, hopelessness, or crisis, gently steer them to a person and share: call or text 988 (Suicide & Crisis Lifeline), or text HOME to 741741.",
    opts.isDemo
      ? "- This is a sample profile for demonstration, not a real person — talk about it as an illustrative example."
      : "- This is the person's own data.",
    "",
    "Their reading right now:",
    `- Resilience buffer: ${Math.round(today.bufferPct)}/100 (${scoreLabel(today.bufferPct)}). 30-day best: ${best}.`,
    `- Trend: ${trendWord(a)}.`,
    "",
    "Each factor today, versus their own rolling 30-day baseline:",
    factorLines,
    "",
    "What's depleting the buffer most right now (most to least):",
    depletors,
  ].join("\n");
}
