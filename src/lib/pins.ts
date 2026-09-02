export type Pin = { id: string; number: number; x: number; y: number; pageNo: number | null; body: string; author: string; addressed: boolean };

/** Converts DB comments to numbered pins (only those with a position). Numbering follows comment order. */
export function commentsToPins(
  comments: { id: string; body: string; x: number | null; y: number | null; pageNo: number | null; addressedInVersionId: string | null; author: { name: string | null; email: string } | null }[],
): Pin[] {
  const pins: Pin[] = [];
  comments.forEach((c, i) => {
    if (c.x == null || c.y == null) return;
    pins.push({
      id: c.id,
      number: i + 1,
      x: c.x,
      y: c.y,
      pageNo: c.pageNo,
      body: c.body,
      author: c.author ? c.author.name?.trim() || c.author.email : "Approver",
      addressed: !!c.addressedInVersionId,
    });
  });
  return pins;
}
