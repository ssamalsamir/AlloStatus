"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// The live lifestyle "what-if" inputs (diet / social / exercise), lifted out of
// the reading so the chat can see them too. The sliders in LiveReading write
// here; LiveReading reads them back to redraw the dial, light and chart, and the
// ChatWidget reads them to send the *current* reading to the model. Without this
// the chat would brief the model on the stale server snapshot while the screen
// shows something else.
export type LiveInputs = { diet: number; social: number; exercise: number };

type LiveInputsContextValue = LiveInputs & {
  setDiet: (n: number) => void;
  setSocial: (n: number) => void;
  setExercise: (n: number) => void;
};

const LiveInputsContext = createContext<LiveInputsContextValue | null>(null);

export function LiveInputsProvider({
  initial,
  children,
}: {
  initial: LiveInputs;
  children: ReactNode;
}) {
  const [diet, setDiet] = useState(initial.diet);
  const [social, setSocial] = useState(initial.social);
  const [exercise, setExercise] = useState(initial.exercise);

  const value = useMemo(
    () => ({ diet, social, exercise, setDiet, setSocial, setExercise }),
    [diet, social, exercise],
  );

  return (
    <LiveInputsContext.Provider value={value}>
      {children}
    </LiveInputsContext.Provider>
  );
}

export function useLiveInputs(): LiveInputsContextValue {
  const ctx = useContext(LiveInputsContext);
  if (!ctx) {
    throw new Error("useLiveInputs must be used within LiveInputsProvider");
  }
  return ctx;
}
