/**
 * Published Sanity reads are cached indefinitely by Next.js and refreshed by
 * the Sanity publish webhook through revalidatePath().
 *
 * Keep this out of webhook/dependency-planning queries: those reads need the
 * freshest published state while calculating the invalidation plan.
 */
export const PUBLISHED_SANITY_FETCH_OPTIONS = {
  next: {
    revalidate: false,
  },
} as const;
