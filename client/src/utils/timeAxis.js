const TARGET_TICKS = 8;

export const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export const formatDate = (t) => new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
export const formatTime = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const formatTooltipTime = (timeKey) => `${formatDate(timeKey)}, ${formatTime(timeKey)}`;

/**
 * Computes tick timestamps for the X-axis.
 * Uses chronological time distance to ensure ticks never collide or overwrite each other,
 * even when multiple sensors/readings occur within seconds or minutes.
 */
export const getDayTicks = (data, timeRange = 24) => {
  if (!data || !data.length) return [];
  const times = data.map(d => (d.isGap ? null : d.timeKey)).filter(t => t !== null && t !== undefined);
  if (!times.length) return [];

  // Determine if multi-day view
  const totalDuration = times[times.length - 1] - times[0];
  const isMultiDay = timeRange > 24 || totalDuration > 24 * 3600 * 1000;
  const ticks = [];

  if (isMultiDay) {
    // For multi-day view: show each unique day (at least 16h apart so days don't collide)
    const minDayGap = 16 * 3600 * 1000;
    let lastTickTime = -Infinity;
    let lastDateStr = null;

    times.forEach(t => {
      const dateStr = new Date(t).toDateString();
      if (dateStr !== lastDateStr && (t - lastTickTime >= minDayGap || ticks.length === 0)) {
        ticks.push(t);
        lastTickTime = t;
        lastDateStr = dateStr;
      }
    });
    return ticks;
  }

  // Single-day view (<= 24h):
  // Calculate minimum time gap required between ticks (at least 45 min for 24h view)
  const rangeMs = timeRange * 3600 * 1000;
  const effectiveSpan = Math.max(totalDuration, rangeMs * 0.5);
  const minTimeGap = Math.max(
    timeRange <= 1 ? 5 * 60 * 1000 : 45 * 60 * 1000,
    Math.floor(effectiveSpan / TARGET_TICKS)
  );

  let lastTickTime = -Infinity;
  times.forEach(t => {
    if (t - lastTickTime >= minTimeGap) {
      ticks.push(t);
      lastTickTime = t;
    }
  });

  // Include the last reading if it's reasonably spaced from the previous tick
  const lastTime = times[times.length - 1];
  if (ticks.length > 0 && lastTime !== ticks[ticks.length - 1]) {
    if (lastTime - lastTickTime >= minTimeGap * 0.6) {
      ticks.push(lastTime);
    }
  }

  return ticks;
};

/**
 * Custom SVG tick renderer for Recharts XAxis.
 * - For multi-day views (> 24h): Renders a single clean Date label ("Nov 10", "Nov 11").
 * - For single-day views (<= 24h): Renders the 3-hour Time ("3:00 AM", "6:00 AM"),
 *   and adds the date only on day transitions (crossing midnight).
 */
export const makeDayAwareTick = (ticks, { fontSize = 11, fill = "#666", timeRange = 24 } = {}) => ({ x, y, payload }) => {
  const value = payload.value;
  if (value === null || value === undefined) return null;

  const isMultiDay = timeRange > 24;

  if (isMultiDay) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text textAnchor="middle" fontSize={fontSize} fill={fill} dy="1.1em" fontWeight={600}>
          {formatDate(value)}
        </text>
      </g>
    );
  }

  const i = ticks.indexOf(value);
  const startsDay = i === 0 || (i > 0 && !isSameDay(ticks[i - 1], value));

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fontSize={fontSize} fill={fill}>
        <tspan x={0} dy="0.9em">{formatTime(value)}</tspan>
        {startsDay && (
          <tspan x={0} dy="1.2em" fontWeight={700} fill="#333">
            {formatDate(value)}
          </tspan>
        )}
      </text>
    </g>
  );
};
