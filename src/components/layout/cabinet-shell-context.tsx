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

export type CabinetShellContextValue = {
  shellContextToken: string;
  authFailureEpoch: number;
  notifyAuthFailure: () => void;
  requestShellRefreshIfStale: (freshShellContextToken: string) => void;
  acknowledgeShellContextMatch: () => void;
};

const CabinetShellContext = createContext<CabinetShellContextValue | null>(null);

export function useCabinetShellContext(): CabinetShellContextValue | null {
  return useContext(CabinetShellContext);
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
  const [authFailureEpoch, setAuthFailureEpoch] = useState(0);
  const refreshedPairsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    refreshedPairsRef.current.clear();
  }, [shellContextToken]);

  const notifyAuthFailure = useCallback(() => {
    setAuthFailureEpoch((n) => n + 1);
  }, []);

  const acknowledgeShellContextMatch = useCallback(() => {
    refreshedPairsRef.current.clear();
  }, []);

  const requestShellRefreshIfStale = useCallback(
    (freshShellContextToken: string) => {
      if (shellContextToken === freshShellContextToken) {
        refreshedPairsRef.current.clear();
        return;
      }
      const pair = `${shellContextToken}|${freshShellContextToken}`;
      const attempts = refreshedPairsRef.current.get(pair) ?? 0;
      if (attempts >= 2) {
        return;
      }
      refreshedPairsRef.current.set(pair, attempts + 1);
      router.refresh();
    },
    [router, shellContextToken],
  );

  const value = useMemo(
    () => ({
      shellContextToken,
      authFailureEpoch,
      notifyAuthFailure,
      requestShellRefreshIfStale,
      acknowledgeShellContextMatch,
    }),
    [
      shellContextToken,
      authFailureEpoch,
      notifyAuthFailure,
      requestShellRefreshIfStale,
      acknowledgeShellContextMatch,
    ],
  );

  return <CabinetShellContext.Provider value={value}>{children}</CabinetShellContext.Provider>;
}
