"use client";

import {
  createContext,
  useCallback,
  useContext,
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
  const refreshedPairsRef = useRef<Set<string>>(new Set());

  const notifyAuthFailure = useCallback(() => {
    setAuthFailureEpoch((n) => n + 1);
  }, []);

  const requestShellRefreshIfStale = useCallback(
    (freshShellContextToken: string) => {
      if (shellContextToken === freshShellContextToken) {
        return;
      }
      const pair = `${shellContextToken}|${freshShellContextToken}`;
      if (refreshedPairsRef.current.has(pair)) {
        return;
      }
      refreshedPairsRef.current.add(pair);
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
    }),
    [shellContextToken, authFailureEpoch, notifyAuthFailure, requestShellRefreshIfStale],
  );

  return <CabinetShellContext.Provider value={value}>{children}</CabinetShellContext.Provider>;
}
