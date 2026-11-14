const GAP_FACTOR = 3;
const MIN_GAP_MS = 5 * 60 * 1000;

const getGapThresholdMs = (points) => {
  const intervals = [];
  for (let i = 1; i < points.length; i++) {
    intervals.push(points[i].timeKey - points[i - 1].timeKey);
  }
  if (intervals.length < 2) return Infinity;
  intervals.sort((a, b) => a - b);
  const typical = intervals[Math.floor(0.9 * (intervals.length - 1))];
  return Math.max(typical * GAP_FACTOR, MIN_GAP_MS);
};

export const buildSeriesWithGaps = (data, paramKey) => {
  const points = data.filter(d => d[paramKey] !== undefined && d[paramKey] !== null);
  const thresholdMs = getGapThresholdMs(points);
  const result = [];
  points.forEach((point, i) => {
    const prev = points[i - 1];
    if (prev && point.timeKey - prev.timeKey > thresholdMs) {
      result.push({ timeKey: prev.timeKey + 1, timeLabel: "", [paramKey]: null, isGap: true });
    }
    result.push(point);
  });
  return result;
};
