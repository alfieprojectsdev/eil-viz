import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from "recharts";
import { readTokens } from "../lib/tokens";
import "./TransectChart.css";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const ptData = payload[0].payload;
    return (
      <div className="map-tooltip">
        <span className="tt-label">Distance</span>
        <span className="tt-val">{Math.round(ptData.dist_m)}m</span>
        <span className="tt-sub">Elev: {Math.round(ptData.elev_m)}m</span>
      </div>
    );
  }
  return null;
};

const CHART_TOKENS = [
  "--color-chart-grid", "--color-chart-axis", "--color-chart-tick",
  "--color-chart-elev-line", "--color-chart-elev-fill-top", "--color-chart-elev-fill-bottom",
  "--color-chart-runout-line", "--color-chart-runout-label",
  "--color-chart-peak", "--color-chart-site", "--color-chart-marker-stroke",
];

const TICK_FONT ={ fontSize: 11, fontWeight: "bold", fontFamily: "system-ui, -apple-system, sans-serif" };

export default function TransectChart({ data }) {
  const rawTransect = data.path || data._viz_transect || [];
  const initialValidE = rawTransect.find(p => p.elev_m <= 5000)?.elev_m || 0;

  const transect = rawTransect.reduce((acc, pt) => {
    const prevValid = acc.length > 0 ? acc[acc.length - 1].elev_m : initialValidE;
    const e = pt.elev_m > 5000 ? prevValid : pt.elev_m;
    acc.push({ ...pt, elev_m: e });
    return acc;
  }, []);

  const metrics = data.metrics;
  const runoutDist = metrics.required_runout_3x;

  // Enforce a minimum domain of 250m to prevent visual collapse of tiny runouts
  const maxTransectDist = transect.length > 0 ? transect[transect.length - 1].dist_m : 0;
  const axisMaxDist = Math.max(250, maxTransectDist, runoutDist);

  // Recharts sets these as SVG attributes, so pass resolved values, not var().
  const color = readTokens(CHART_TOKENS);
  const axis = color["--color-chart-axis"];
  const tick = { fill: color["--color-chart-tick"], ...TICK_FONT };
  const markerStroke = color["--color-chart-marker-stroke"];

  return (
    <div className="transect-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={transect}
          margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color["--color-chart-elev-fill-top"]} stopOpacity={0.6} />
              <stop offset="95%" stopColor={color["--color-chart-elev-fill-bottom"]} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={color["--color-chart-grid"]} vertical={true} horizontal={true} />
          <XAxis
            dataKey="dist_m"
            type="number"
            domain={[0, axisMaxDist]}
            tickCount={6}
            tickFormatter={(v) => `${Math.round(v)}m`}
            stroke={axis}
            tick={tick}
            label={{ value: "HORIZONTAL DISTANCE FROM PEAK (m)", position: "insideBottom", offset: -15, fill: axis, fontSize: 10, fontWeight: "bold" }}
          />
          <YAxis
            domain={['dataMin - 10', 'dataMax + 10']}
            tickCount={5}
            tickFormatter={(v) => `${Math.round(v)}m`}
            stroke={axis}
            tick={tick}
            label={{ value: "ELEVATION (m)", angle: -90, position: "insideLeft", offset: 15, fill: axis, fontSize: 10, fontWeight: "bold" }}
          />
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />

          {/* Runout Band Reference */}
          <ReferenceLine
            x={runoutDist}
            stroke={color["--color-chart-runout-line"]}
            strokeDasharray="6 4"
            label={{ position: 'top', value: '3×ΔE limit', fill: color["--color-chart-runout-label"], fontSize: 11, fontWeight: 'bold' }}
          />

          {/* Peak and Site markers */}
          <ReferenceDot x={0} y={metrics.elevation_peak} r={6} fill={color["--color-chart-peak"]} stroke={markerStroke} strokeWidth={1.5} />
          <ReferenceDot x={metrics.horizontal_distance_h} y={metrics.elevation_site} r={6} fill={color["--color-chart-site"]} stroke={markerStroke} strokeWidth={1.5} />

          <Area
            type="linear"
            dataKey="elev_m"
            stroke={color["--color-chart-elev-line"]}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorElev)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
