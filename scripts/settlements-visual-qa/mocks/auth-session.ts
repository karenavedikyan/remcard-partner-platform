/** Visual QA stub — no /api/auth/me. */
export async function fetchAuthMeSafe() {
  return {
    ok: true as const,
    data: {
      user: {
        id: "qa-staff-session",
        role: "CLIENT",
        displayName: "QA Staff",
        publicId: "RC-QA-STAFF",
      },
    },
  };
}
