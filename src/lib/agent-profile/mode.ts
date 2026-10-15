export function isPureAgentActivities(activities: string[] | null | undefined): boolean {
  const list = activities ?? [];
  return list.includes("AGENT") && !list.includes("STORE") && !list.includes("SERVICE");
}
