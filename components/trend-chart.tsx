"use client";

import { useMemo, useRef, useState } from "react";
import { useTrendEvents } from "@/components/trend-events-provider";
import { scoreColor, scoreLabel } from "@/lib/colors";
import {
  EVENT_CATEGORY_META,
  categoryMeta,
  eventLabel,
} from "@/lib/events/categories";
import { buildTrendNarrative, eventsInTrend } from "@/lib/events/narrative";
import { EVENT_CATEGORIES, type EventCategory, type TrendEvent } from "@/lib/events/types";
import { formatDate } from "@/lib/format";

const W = 640;
const H = 220;
const PAD_L = 30;
const PAD_R = 46;
const PAD_Y = 28;
const PAD_TOP = 22;

type TrendPoint = { date: string; bufferPct: number };

export function TrendSection({
  trend,
  best,
}: {
  trend: TrendPoint[];
  best?: TrendPoint | null;
}) {
  const { events, isDemo, pending, addEvent, updateEvent, removeEvent } = useTrendEvents();

  return (
    <TrendChartInteractive
      trend={trend}
      best={best}
      events={events}
      pending={pending}
      isDemo={isDemo}
      onAdd={addEvent}
      onUpdate={updateEvent}
      onDelete={removeEvent}
    />
  );
}

function TrendChartInteractive({
  trend,
  best,
  events,
  pending,
  onAdd,
  onUpdate,
  onDelete,
  isDemo,
}: {
  trend: TrendPoint[];
  best?: TrendPoint | null;
  events: TrendEvent[];
  pending: boolean;
  isDemo: boolean;
  onAdd: (date: string, category: EventCategory, note: string | null) => Promise<boolean>;
  onUpdate: (
    id: string,
    patch: { category?: EventCategory; note?: string | null },
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const trendEvents = useMemo(
    () => eventsInTrend(events, trend.map((p) => p.date)),
    [events, trend],
  );
  const narrative = useMemo(() => buildTrendNarrative(trend, events), [trend, events]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TrendEvent[]>();
    for (const e of trendEvents) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [trendEvents]);

  if (trend.length === 0) {
    return <p className="text-sm text-muted">No history yet.</p>;
  }

  const n = trend.length;
  const plotW = W - PAD_L - PAD_R;
  const x = (i: number) => (n === 1 ? PAD_L + plotW / 2 : PAD_L + (i / (n - 1)) * plotW);
  const y = (pct: number) => PAD_TOP + (1 - pct / 100) * (H - PAD_TOP - PAD_Y);

  const points = trend.map((p, i) => `${x(i).toFixed(1)},${y(p.bufferPct).toFixed(1)}`);
  const line = `M ${points.join(" L ")}`;
  const area = `${line} L ${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L ${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  const today = trend[n - 1];
  const color = scoreColor(today.bufferPct);
  const bestIdx = best ? trend.findIndex((p) => p.date === best.date) : -1;
  const gridlines = [100, 75, 50, 25, 0];

  const activeIdx = hoverIdx ?? (selectedDate ? trend.findIndex((p) => p.date === selectedDate) : null);
  const activePoint = activeIdx != null && activeIdx >= 0 ? trend[activeIdx] : null;

  function indexFromClientX(clientX: number): number {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    const clamped = Math.max(PAD_L, Math.min(W - PAD_R, relX));
    if (n === 1) return 0;
    const ratio = (clamped - PAD_L) / plotW;
    return Math.round(ratio * (n - 1));
  }

  function openDay(date: string, eventId?: string) {
    setSelectedDate(date);
    setEditingEventId(eventId ?? null);
  }

  async function addTag(category: EventCategory, note: string) {
    if (!selectedDate) return;
    await onAdd(selectedDate, category, note.trim() || null);
  }

  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-muted">
        Tap any day to tag what happened. Tags can be edited or removed anytime —
        they feed into your reading and chat.
      </p>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full cursor-crosshair touch-none"
          style={{ aspectRatio: `${W} / ${H}` }}
          onPointerMove={(e) => setHoverIdx(indexFromClientX(e.clientX))}
          onPointerLeave={() => setHoverIdx(null)}
          onClick={(e) => openDay(trend[indexFromClientX(e.clientX)].date)}
          role="img"
          aria-label="Interactive 30-day resilience buffer trend. Click a day to tag an event."
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridlines.map((pct) => (
            <g key={pct}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(pct)}
                y2={y(pct)}
                stroke="var(--border)"
                strokeWidth="1"
                strokeOpacity={pct === 50 ? 0 : 0.5}
              />
              <text
                x={PAD_L - 7}
                y={y(pct)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="var(--muted)"
              >
                {pct}
              </text>
            </g>
          ))}

          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(50)}
            y2={y(50)}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <text
            x={W - PAD_R + 4}
            y={y(50)}
            dominantBaseline="middle"
            fontSize="10"
            fill="var(--muted)"
          >
            avg
          </text>

          <path d={area} fill="url(#trend-fill)" />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {trend.map((p, i) => {
            const dayEvents = eventsByDate.get(p.date);
            if (!dayEvents?.length) return null;
            const cx = x(i);
            const cy = y(p.bufferPct);
            const meta = categoryMeta(dayEvents[0].category);
            return (
              <g key={`evt-${p.date}`}>
                <line
                  x1={cx}
                  x2={cx}
                  y1={cy - 6}
                  y2={PAD_TOP - 2}
                  stroke={meta.color}
                  strokeWidth="1.5"
                  strokeOpacity="0.55"
                  strokeDasharray="2 3"
                />
                <circle cx={cx} cy={PAD_TOP - 8} r="9" fill="var(--surface)" stroke={meta.color} strokeWidth="1.5" />
                <text
                  x={cx}
                  y={PAD_TOP - 8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  fontWeight="700"
                  fill={meta.color}
                >
                  {meta.glyph}
                </text>
                {dayEvents.length > 1 && (
                  <text
                    x={cx + 11}
                    y={PAD_TOP - 8}
                    dominantBaseline="central"
                    fontSize="8"
                    fill="var(--muted)"
                  >
                    +{dayEvents.length - 1}
                  </text>
                )}
              </g>
            );
          })}

          {trend.map((p, i) => (
            <circle
              key={p.date}
              cx={x(i)}
              cy={y(p.bufferPct)}
              r={
                (activeIdx === i ? 5.5 : i === n - 1 ? 4 : i === bestIdx && i !== n - 1 ? 3.5 : 2.5) + 6
              }
              fill="transparent"
              pointerEvents="all"
            />
          ))}

          {trend.map((p, i) => {
            const isToday = i === n - 1;
            const isBest = i === bestIdx && i !== n - 1;
            const isActive = activeIdx === i;
            const r = isActive ? 5.5 : isToday ? 4 : isBest ? 3.5 : 2.5;
            return (
              <circle
                key={`dot-${p.date}`}
                cx={x(i)}
                cy={y(p.bufferPct)}
                r={r}
                fill={isBest ? "var(--background)" : color}
                fillOpacity={isToday || isActive || isBest ? 1 : 0.35}
                stroke={isBest ? "var(--muted)" : isActive ? color : "none"}
                strokeWidth={isBest ? 1.5 : isActive ? 2 : 0}
                pointerEvents="none"
              />
            );
          })}

          {activePoint && activeIdx != null && activeIdx !== n - 1 && (
            <text
              x={x(activeIdx)}
              y={y(activePoint.bufferPct) - 12}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill={scoreColor(activePoint.bufferPct)}
            >
              {Math.round(activePoint.bufferPct)}
            </text>
          )}

          <circle cx={x(n - 1)} cy={y(today.bufferPct)} r="6" fill="var(--background)" pointerEvents="none" />
          <circle cx={x(n - 1)} cy={y(today.bufferPct)} r="4" fill={color} pointerEvents="none" />
          <text
            x={x(n - 1)}
            y={y(today.bufferPct) - 11}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill={color}
            pointerEvents="none"
          >
            {Math.round(today.bufferPct)}
          </text>
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-xl bg-forest px-3 py-1.5 text-xs text-white shadow-md"
            style={{ opacity: hoverIdx != null ? 1 : 0.85 }}
          >
            <span className="font-medium">{formatDate(activePoint.date)}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span>{Math.round(activePoint.bufferPct)} buffer</span>
            {(eventsByDate.get(activePoint.date)?.length ?? 0) > 0 && (
              <>
                <span className="mx-1.5 opacity-50">·</span>
                <span>{eventsByDate.get(activePoint.date)!.length} tagged</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span>{formatDate(trend[0].date)}</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full" style={{ background: color }} aria-hidden />
          today · {scoreLabel(today.bufferPct).toLowerCase()}
        </span>
      </div>

      {selectedDate && (
        <TagPanel
          date={selectedDate}
          bufferPct={trend.find((p) => p.date === selectedDate)?.bufferPct ?? null}
          events={eventsByDate.get(selectedDate) ?? []}
          pending={pending}
          isDemo={isDemo}
          editingEventId={editingEventId}
          onEditingEventIdChange={setEditingEventId}
          onAdd={addTag}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => {
            setSelectedDate(null);
            setEditingEventId(null);
          }}
        />
      )}

      {narrative && (
        <p className="mt-4 rounded-xl bg-surface-2/80 px-4 py-3 text-sm leading-relaxed text-muted">
          <span className="font-medium text-foreground">Your timeline: </span>
          {narrative}
        </p>
      )}

      {trendEvents.length > 0 && (
        <ul className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            All tags — click to edit
          </p>
          {trendEvents.map((e) => {
            const meta = categoryMeta(e.category);
            return (
              <li key={e.id}>
                <div
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-surface-2/60"
                  style={{
                    outline: `1px solid color-mix(in srgb, ${meta.color} 20%, transparent)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openDay(e.date, e.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${meta.color} 14%, var(--surface))`,
                        color: meta.color,
                      }}
                    >
                      {meta.glyph}
                    </span>
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{formatDate(e.date)}</span>
                      <span className="text-muted"> · {eventLabel(e)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openDay(e.date, e.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      void onDelete(e.id);
                    }}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                    aria-label={`Delete ${eventLabel(e)}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TagPanel({
  date,
  bufferPct,
  events,
  pending,
  isDemo,
  editingEventId,
  onEditingEventIdChange,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: {
  date: string;
  bufferPct: number | null;
  events: TrendEvent[];
  pending: boolean;
  isDemo: boolean;
  editingEventId: string | null;
  onEditingEventIdChange: (id: string | null) => void;
  onAdd: (category: EventCategory, note: string) => void;
  onUpdate: (
    id: string,
    patch: { category?: EventCategory; note?: string | null },
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [newNote, setNewNote] = useState("");

  return (
    <div
      className="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
      role="dialog"
      aria-label={`Tag events for ${formatDate(date)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Tag this day</p>
          <p className="font-display mt-1 text-xl text-foreground">
            {formatDate(date)}
            {bufferPct != null && (
              <span className="ml-2 text-base text-muted">· buffer {Math.round(bufferPct)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted transition hover:text-foreground"
        >
          Done
        </button>
      </div>

      {events.length > 0 && (
        <ul className="mt-4 space-y-3">
          {events.map((e) => (
            <EventTagRow
              key={e.id}
              event={e}
              pending={pending}
              editing={editingEventId === e.id}
              onEdit={() => onEditingEventIdChange(e.id)}
              onCancelEdit={() => onEditingEventIdChange(null)}
              onSave={async (patch) => {
                const ok = await onUpdate(e.id, patch);
                if (ok) onEditingEventIdChange(null);
              }}
              onDelete={async () => {
                await onDelete(e.id);
                if (editingEventId === e.id) onEditingEventIdChange(null);
              }}
            />
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Add a tag
      </p>
      <CategoryPicker disabled={pending} onPick={(cat) => onAdd(cat, newNote)} />
      <input
        type="text"
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        placeholder="Optional detail (e.g. midterm, red-eye flight)"
        className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
        maxLength={120}
      />

      {isDemo && (
        <p className="mt-3 text-xs text-muted">
          Tags save in this browser for the demo sample — sign in to keep them across devices.
        </p>
      )}
    </div>
  );
}

function EventTagRow({
  event,
  pending,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  event: TrendEvent;
  pending: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: { category?: EventCategory; note?: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const meta = categoryMeta(event.category);
  const [category, setCategory] = useState(event.category);
  const [note, setNote] = useState(event.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!editing) {
    if (confirmDelete) {
      return (
        <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2/70 px-3 py-2.5">
          <span className="text-sm text-muted">
            Remove <span className="font-medium text-foreground">{meta.label}</span>
            {event.note ? ` (${event.note})` : ""}?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void onDelete()}
              className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Yes, remove
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg px-3 py-1 text-xs text-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </li>
      );
    }

    return (
      <li className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/70 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium" style={{ color: meta.color }}>
            {meta.label}
          </span>
          {event.note ? (
            <p className="mt-0.5 text-sm text-muted">{event.note}</p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-2">No note — tap Edit to add one</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={onEdit}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-surface disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg px-2.5 py-1 text-xs text-muted transition hover:bg-surface hover:text-foreground disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border bg-surface-2/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Editing tag</p>
      <CategoryPicker
        disabled={pending}
        selected={category}
        onPick={setCategory}
        mode="select"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
        maxLength={120}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void onSave({ category, note: note.trim() || null })}
          className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setCategory(event.category);
            setNote(event.note ?? "");
            setConfirmDelete(false);
            onCancelEdit();
          }}
          className="rounded-full px-4 py-1.5 text-xs text-muted transition hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        {!confirmDelete ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            className="ml-auto rounded-full px-3 py-1.5 text-xs text-muted transition hover:text-foreground disabled:opacity-50"
          >
            Delete tag
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted">Remove this tag?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => void onDelete()}
              className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
            >
              Yes, delete
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted hover:text-foreground"
            >
              No
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function CategoryPicker({
  disabled,
  onPick,
  selected,
  mode = "add",
}: {
  disabled: boolean;
  onPick: (cat: EventCategory) => void;
  selected?: EventCategory;
  mode?: "add" | "select";
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${mode === "add" ? "mt-2" : "mt-3"}`}>
      {EVENT_CATEGORIES.map((cat) => {
        const meta = EVENT_CATEGORY_META[cat];
        const active = mode === "select" && selected === cat;
        return (
          <button
            key={cat}
            type="button"
            disabled={disabled}
            onClick={() => onPick(cat)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: `color-mix(in srgb, ${meta.color} ${active ? 22 : 12}%, var(--surface))`,
              color: meta.color,
              outline: active
                ? `2px solid ${meta.color}`
                : `1px solid color-mix(in srgb, ${meta.color} 28%, transparent)`,
            }}
          >
            <span className="font-bold">{meta.glyph}</span>
            {meta.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

/** @deprecated Use TrendSection inside TrendEventsProvider. */
export function TrendChart(props: { trend: TrendPoint[]; best?: TrendPoint | null }) {
  return <TrendSection trend={props.trend} best={props.best} />;
}
