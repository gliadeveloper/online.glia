"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type StackNavContextValue = {
  titleOverride: string | undefined;
  setTitleOverride: (title: string | undefined) => void;
  trailingLabel: string | undefined;
  setTrailingLabel: (label: string | undefined) => void;
  backHrefOverride: string | undefined;
  setBackHrefOverride: (href: string | undefined) => void;
  backLabelOverride: string | undefined;
  setBackLabelOverride: (label: string | undefined) => void;
};

const StackNavContext = createContext<StackNavContextValue | null>(null);

export function StackNavProvider({ children }: { children: React.ReactNode }) {
  const [titleOverride, setTitleOverride] = useState<string | undefined>();
  const [trailingLabel, setTrailingLabel] = useState<string | undefined>();
  const [backHrefOverride, setBackHrefOverride] = useState<string | undefined>();
  const [backLabelOverride, setBackLabelOverride] = useState<string | undefined>();

  const value = useMemo(
    () => ({
      titleOverride,
      setTitleOverride,
      trailingLabel,
      setTrailingLabel,
      backHrefOverride,
      setBackHrefOverride,
      backLabelOverride,
      setBackLabelOverride,
    }),
    [titleOverride, trailingLabel, backHrefOverride, backLabelOverride],
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

export function useStackNavBackOverride() {
  const context = useContext(StackNavContext);
  return {
    backHrefOverride: context?.backHrefOverride,
    backLabelOverride: context?.backLabelOverride,
  };
}

/** Syncs dynamic back target into mobile stack BackNav. */
export function StackNavBack({ href, label }: { href: string; label: string }) {
  const context = useContext(StackNavContext);

  useEffect(() => {
    if (!context) return;
    context.setBackHrefOverride(href);
    context.setBackLabelOverride(label);
    return () => {
      context.setBackHrefOverride(undefined);
      context.setBackLabelOverride(undefined);
    };
  }, [context, href, label]);

  return null;
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
