// Shape-preserving cubic interpolation: pass through every node without bumps.
export function buildFrequencyCurve(points) {
  if (points.length < 2 || points.some((point, index) => (
    !Number.isFinite(point.x) || !Number.isFinite(point.y)
    || (index > 0 && point.x <= points[index - 1].x)
  ))) throw new Error("A frequency curve needs at least two increasing finite x coordinates.");

  const widths = points.slice(1).map((point, index) => point.x - points[index].x);
  const slopes = widths.map((width, index) => (points[index + 1].y - points[index].y) / width);
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    const before = slopes[index - 1];
    const after = slopes[index];
    if (before * after <= 0) return 0;
    const firstWeight = 2 * widths[index] + widths[index - 1];
    const secondWeight = widths[index] + 2 * widths[index - 1];
    return (firstWeight + secondWeight) / (firstWeight / before + secondWeight / after);
  });
  const segments = widths.map((width, index) => ({
    start: points[index],
    control1: { x: points[index].x + width / 3, y: points[index].y + tangents[index] * width / 3 },
    control2: { x: points[index + 1].x - width / 3, y: points[index + 1].y - tangents[index + 1] * width / 3 },
    end: points[index + 1],
  }));
  const coordinate = (point) => `${Number(point.x.toFixed(3))} ${Number(point.y.toFixed(3))}`;
  const path = `M${coordinate(points[0])} ${segments.map(({ control1, control2, end }) => (
    `C${coordinate(control1)} ${coordinate(control2)} ${coordinate(end)}`
  )).join(" ")}`;
  return { path, segments };
}
