import type { CertificatePolicyPatchBody } from "@/lib/certificate-policy/types";
import { getHarnessApiMode } from "../harness-state";
import {
  harnessWorkspaceAfterPatch,
  harnessWorkspaceForScene,
} from "../fixtures/workspaces";

let workspaceSnapshot = harnessWorkspaceForScene("settings-general");

export function resetHarnessCertificatePolicyWorkspace(sceneId: string) {
  workspaceSnapshot = structuredClone(harnessWorkspaceForScene(sceneId));
}

function activeSceneWorkspace() {
  return workspaceSnapshot;
}

export async function fetchCertificatePolicyWorkspace() {
  const mode = getHarnessApiMode();
  if (mode === "network_error") {
    return {
      ok: false as const,
      code: "ERROR" as const,
      message: "Сеть недоступна (harness)",
    };
  }
  if (mode === "slow_pending") {
    await new Promise((r) => setTimeout(r, 1200));
  }
  return { ok: true as const, workspace: structuredClone(activeSceneWorkspace()) };
}

export async function patchCertificatePolicy(body: CertificatePolicyPatchBody) {
  const mode = getHarnessApiMode();
  if (mode === "network_error") {
    return {
      ok: false as const,
      code: "ERROR" as const,
      message: "Сеть недоступна (harness)",
    };
  }
  if (mode === "conflict_409" || (body.action === "save_general" && body.terms?.validityDays === 409)) {
    return {
      ok: false as const,
      code: "VERSION_CONFLICT" as const,
      message: "Условия изменились",
      workspace: structuredClone(workspaceSnapshot),
    };
  }
  if (mode === "slow_pending") {
    await new Promise((r) => setTimeout(r, 800));
  }
  workspaceSnapshot = harnessWorkspaceAfterPatch(body, workspaceSnapshot);
  return { ok: true as const, workspace: structuredClone(workspaceSnapshot) };
}