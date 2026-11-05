/**
 * Triggers Next.js on-demand ISR revalidation on the frontend
 * without blocking the backend response.
 */
export const revalidateFrontend = (
  options: { tag?: string; path?: string } = { tag: 'products' }
) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const secret = process.env.REVALIDATION_SECRET || 'sobjihaat_secret_revalidate_2026';

    const query = new URLSearchParams({ secret });
    if (options.tag) query.append('tag', options.tag);
    if (options.path) query.append('path', options.path);

    const revalidateUrl = `${clientUrl}/api/revalidate?${query.toString()}`;

    // Asynchronous non-blocking fire-and-forget
    fetch(revalidateUrl, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          console.log(`[Revalidation] Frontend revalidated successfully:`, options.tag || options.path);
        }
      })
      .catch((err) => {
        console.warn(`[Revalidation] Failed to notify frontend revalidation:`, err?.message || err);
      });
  } catch (err: any) {
    console.warn(`[Revalidation] Error:`, err?.message || err);
  }
};
