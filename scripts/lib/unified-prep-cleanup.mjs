/** Execute cleanup after setup/work failure too; never hide either error. */
export async function withRequiredCleanup(work, cleanup) {
  let value, primary;
  try { value = await work(); } catch (error) { primary = error; }
  let cleanupError;
  try { await cleanup(); } catch (error) { cleanupError = error; }
  if (primary && cleanupError) {
    throw new AggregateError([primary, cleanupError], `work: ${primary.message}; cleanup: ${cleanupError.message}`);
  }
  if (cleanupError) throw cleanupError;
  if (primary) throw primary;
  return value;
}
