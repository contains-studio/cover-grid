export function pinchTransform({ startScale, startDistance, startMidpoint, startCenter, currentDistance, currentMidpoint, minScale = 1, maxScale = 4 }) {
  const safeDistance = Math.max(1, startDistance);
  const scale = Math.min(maxScale, Math.max(minScale, startScale * currentDistance / safeDistance));
  const zoomRatio = scale / startScale;
  return {
    scale: Number(scale.toFixed(3)),
    x: Math.round(currentMidpoint.x - (startMidpoint.x - startCenter.x) * zoomRatio),
    y: Math.round(currentMidpoint.y - (startMidpoint.y - startCenter.y) * zoomRatio),
  };
}
