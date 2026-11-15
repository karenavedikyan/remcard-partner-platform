export type HarnessViewerRole =
  | "owner-master"
  | "owner-store"
  | "owner-company"
  | "agent"
  | "employee";

export type HarnessApiMode = "success" | "conflict_409" | "network_error" | "slow_pending";

export type HarnessScene = "dialog" | "catalog" | "issuance" | "issued-dark";

type Listener = () => void;

const state = {
  role: "owner-store" as HarnessViewerRole,
  apiMode: "success" as HarnessApiMode,
  scene: "dialog" as HarnessScene,
  activeSceneId: "settings-general" as string,
  dialogOpen: true,
  dirtySim: false,
};

const listeners = new Set<Listener>();

export function getHarnessState() {
  return { ...state };
}

export function setHarnessRole(role: HarnessViewerRole) {
  state.role = role;
  listeners.forEach((l) => l());
}

export function setHarnessApiMode(mode: HarnessApiMode) {
  state.apiMode = mode;
  listeners.forEach((l) => l());
}

export function setHarnessScene(scene: HarnessScene) {
  state.scene = scene;
  listeners.forEach((l) => l());
}

export function setHarnessActiveSceneId(sceneId: string) {
  state.activeSceneId = sceneId;
  listeners.forEach((l) => l());
}

export function getHarnessActiveSceneId() {
  return state.activeSceneId;
}

export function getHarnessApiMode() {
  return state.apiMode;
}

export function setHarnessDialogOpen(open: boolean) {
  state.dialogOpen = open;
  listeners.forEach((l) => l());
}

export function subscribeHarnessState(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function harnessCanEditSettings(role: HarnessViewerRole): boolean {
  return role === "owner-master" || role === "owner-store" || role === "owner-company";
}

export function harnessViewerUserId(role: HarnessViewerRole): string {
  switch (role) {
    case "owner-master":
      return "viewer-master";
    case "owner-store":
      return "viewer-store";
    case "owner-company":
      return "viewer-company";
    case "agent":
      return "viewer-agent";
    case "employee":
      return "viewer-employee";
  }
}