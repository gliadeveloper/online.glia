"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type StackNavContextValue = {
  titleOverride: string | undefined;
  setTitleOverride: (title: string | undefined) => void;
  trailingLabel: string | undefined;
  setTrailingLabel: (label: string | undefined) => void;
};

const StackNavContext = createContext<StackNavContextValue | null>(null);

export function StackNavProvider({ children }: { children: React.ReactNode }) {
  const [titleOverride, setTitleOverride] = useState<string | undefined>();
  const [trailingLabel, setTrailingLabel] = useState<string | undefined>();

  const value = useMemo(
    () => ({ titleOverride, setTitleOverride, trailingLabel, setTrailingLabel }),
    [titleOverride, trailingLabel],
  );

  return <StackNavContext.Provider value={value}>{children}</StackNavContext.Provider>;
}

export function useStackNavTitleOverride() {
  return useContext(StackNavContext)?.titleOverride;
}

export function useStackNavTrailingLabel() {
  return useContext(StackNavContext)?.trailingLabel;
}

export function useStackNavActions() {
  return useContext(StackNavContext);
}

/** Syncs dynamic page title into mobile stack BackNav. */
export function StackNavTitle({ title }: { title: string }) {
  const context = useContext(StackNavContext);

  useEffect(() => {
    if (!context) return;
    context.setTitleOverride(title);
    return () => context.setTitleOverride(undefined);
  }, [context, title]);

  return null;
}

/** Syncs trailing label (e.g. step counter) into immersive BackNav. */
export function StackNavTrailingLabel({ label }: { label: string }) {
  const context = useContext(StackNavContext);

  useEffect(() => {
    if (!context) return;
    context.setTrailingLabel(label);
    return () => context.setTrailingLabel(undefined);
  }, [context, label]);

  return null;
}
