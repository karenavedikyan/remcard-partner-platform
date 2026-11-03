"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type CabinetShellStableContextValue = {
  shellContextToken: string;
  notifyAuthFailure: () => void;
  requestShellRefreshIfStale: (freshShellContextToken: string) => void;
  acknowledgeShellContextMatch: () => void;
  requestShellRefreshIfPrefsBranchMismatch: (
    layoutPrefsSignature: string,
    freshPrefsSignature: string,
  ) => void;
  acknowledgeShellPrefsLayoutMatch: () => void;
  isShellIdentityRefreshExhausted: (freshShellContextToken: string) => boolean;
};

/** @deprecated Use {@link useCabinetShellStableContext}; epoch is separate. */
export type CabinetShellContextValue = CabinetShellStableContextValue & {
  authFailureEpoch: number;
};

const CabinetShellStableContext = createContext<CabinetShellStableContextValue | null>(null);
const CabinetShellAuthFailureEpochContext = createContext(0);
const CabinetShellIdentityRefreshAttemptContext = createContext(0);

export function useCabinetShellStableContext(): CabinetShellStableContextValue | null {
  return useContext(CabinetShellStableContext);
}

export function useCabinetShellAuthFailureEpoch(): number {
  return useContext(CabinetShellAuthFailureEpochContext);
}

/** Bumps when a shell-identity refresh pair is recorded (reconciler UI). */
export function useCabinetShellIdentityRefreshAttempt(): number {
  return useContext(CabinetShellIdentityRefreshAttemptContext);
}

/** Stable shell actions + token (identity does not change when authFailureEpoch bumps). */
export function useCabinetShellContext(): CabinetShellContextValue | null {
  const stable = useCabinetShellStableContext();
  const authFailureEpoch = useCabinetShellAuthFailureEpoch();
  return useMemo(
    () => (stable ? { ...stable, authFailureEpoch } : null),
    [stable, authFailureEpoch],
  );
}

type CabinetShellContextProviderProps = {
  shellContextToken: string;
  children: ReactNode;
};

export function CabinetShellContextProvider({
  shellContextToken,
  children,
}: CabinetShellContextProviderProps) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [authFailureEpoch, setAuthFailureEpoch] = useState(0);
  const [identityRefreshAttempt, setIdentityRefreshAttempt] = useState(0);
  const refreshedPairsRef = useRef<Set<string>>(new Set());
  const prefsRefreshPairsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    refreshedPairsRef.current.clear();
    prefsRefreshPairsRef.current.clear();
    setIdentityRefreshAttempt(0);
  }, [shellContextToken]);

  const notifyAuthFailure = useCallback(() => {
    setAuthFailureEpoch((n) => n + 1);
  }, []);

  const acknowledgeShellContextMatch = useCallback(() => {
    refreshedPairsRef.current.clear();
    setIdentityRefreshAttempt(0);
  }, []);

  const acknowledgeShellPrefsLayoutMatch = useCallback(() => {
    prefsRefreshPairsRef.current.clear();
  }, []);

  const isShellIdentityRefreshExhausted = useCallback(
    (freshShellContextToken: string) => {
      if (shellContextToken === freshShellContextToken) {
        return false;
      }
      const pair = `${shellContextToken}|${freshShellContextToken}`;
      return refreshedPairsRef.current.has(pair);
    },
    [shellContextToken],
  );

  const requestShellRefreshIfPrefsBranchMismatch = useCallback(
    (layoutPrefsSignature: string, freshPrefsSignature: string) => {
      if (layoutPrefsSignature === freshPrefsSignature) {
        prefsRefreshPairsRef.current.clear();
        return;
      }
      const pair = `${layoutPrefsSignature}|${freshPrefsSignature}`;
      if (prefsRefreshPairsRef.current.has(pair)) {
        return;
      }
      prefsRefreshPairsRef.current.add(pair);
      routerRef.current.refresh();
    },
    [],
  );

  const requestShellRefreshIfStale = useCallback(
    (freshShellContextToken: string) => {
      if (shellContextToken === freshShellContextToken) {
        refreshedPairsRef.current.clear();
        return;
      }
      const pair = `${shellContextToken}|${freshShellContextToken}`;
      if (refreshedPairsRef.current.has(pair)) {
        return;
      }
      refreshedPairsRef.current.add(pair);
      setIdentityRefreshAttempt((n) => n + 1);
      routerRef.current.refresh();
    },
    [shellContextToken],
  );

  const stableValue = useMemo(
    () => ({
      shellContextToken,
      notifyAuthFailure,
      requestShellRefreshIfStale,
      acknowledgeShellContextMatch,
      requestShellRefreshIfPrefsBranchMismatch,
      acknowledgeShellPrefsLayoutMatch,
      isShellIdentityRefreshExhausted,
    }),
    [
      shellContextToken,
      notifyAuthFailure,
      requestShellRefreshIfStale,
      acknowledgeShellContextMatch,
      requestShellRefreshIfPrefsBranchMismatch,
      acknowledgeShellPrefsLayoutMatch,
      isShellIdentityRefreshExhausted,
    ],
  );

  return (
    <CabinetShellStableContext.Provider value={stableValue}>
      <CabinetShellAuthFailureEpochContext.Provider value={authFailureEpoch}>
        <CabinetShellIdentityRefreshAttemptContext.Provider value={identityRefreshAttempt}>
          {children}
        </CabinetShellIdentityRefreshAttemptContext.Provider>
      </CabinetShellAuthFailureEpochContext.Provider>
    </CabinetShellStableContext.Provider>
  );
}
