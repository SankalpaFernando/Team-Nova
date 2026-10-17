const TARGET_TICKS = 10;

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

const formatDate = (t) => new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
const formatTime = (t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const formatTooltipTime = (timeKey) => `${formatDate(timeKey)}, ${formatTime(timeKey)}`;

export const getDayTicks = (data) => {
  const times = data.map(d => (d.isGap ? null : d.timeKey));
  const real = times.map((t, i) => ({ t, i })).filter(p => p.t !== null);
  if (!real.length) return [];

  const minGap = Math.max(1, Math.ceil(data.length / TARGET_TICKS));
  const dayStarts = real.filter((p, k) => k === 0 || !isSameDay(real[k - 1].t, p.t));
  const ticks = [];
  let lastIdx = -Infinity;
  let nextDay = 0;

  real.forEach(p => {
    while (nextDay < dayStarts.length && dayStarts[nextDay].i < p.i) nextDay++;
    const isDayStart = nextDay < dayStarts.length && dayStarts[nextDay].i === p.i;
    const nextDayIdx = isDayStart
      ? dayStarts[nextDay + 1]?.i ?? Infinity
      : dayStarts[nextDay]?.i ?? Infinity;

    if (isDayStart || (p.i - lastIdx >= minGap && nextDayIdx - p.i >= minGap)) {
      ticks.push(p.t);
      lastIdx = p.i;
    }
  });
  return ticks;
};

export const makeDayAwareTick = (ticks, { fontSize = 11, fill = "#666" } = {}) => ({ x, y, payload }) => {
  const value = payload.value;
  const i = ticks.indexOf(value);
  const startsDay = i <= 0 || !isSameDay(ticks[i - 1], value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fontSize={fontSize} fill={fill}>
        <tspan x={0} dy="0.9em">{formatTime(value)}</tspan>
        {startsDay && <tspan x={0} dy="1.2em" fontWeight={700}>{formatDate(value)}</tspan>}
      </text>
    </g>
  );
};
