/** Canvas chart helpers — rendered as images embedded in jsPDF exports. */

const BRAND = {
  primary: "#006F5F",
  secondary: "#0E8A72",
  accent: "#22C55E",
  palette: ["#006F5F", "#0E8A72", "#22C55E", "#14B8A6", "#F59E0B", "#6366F1"],
};

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  return { canvas, ctx };
}

export function renderBarChartImage(
  labels: string[],
  values: number[],
  options?: { title?: string; valuePrefix?: string; color?: string }
): string {
  const w = 520;
  const h = 280;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  if (options?.title) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px Helvetica, Arial, sans-serif";
    ctx.fillText(options.title, 16, 22);
  }

  const max = Math.max(...values, 1);
  const padL = 48;
  const padR = 16;
  const padT = options?.title ? 36 : 16;
  const padB = 56;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const barW = chartW / Math.max(labels.length, 1) - 12;
  const color = options?.color ?? BRAND.primary;

  values.forEach((v, i) => {
    const barH = (v / max) * chartH;
    const x = padL + i * (barW + 12) + 6;
    const y = padT + chartH - barH;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = "#64748b";
    ctx.font = "10px Helvetica, Arial, sans-serif";
    const label = labels[i].length > 10 ? `${labels[i].slice(0, 9)}…` : labels[i];
    ctx.fillText(label, x, h - padB + 14);
    ctx.fillStyle = "#0f172a";
    ctx.font = "9px Helvetica, Arial, sans-serif";
    const prefix = options?.valuePrefix ?? "";
    ctx.fillText(`${prefix}${v}`, x, y - 4);
  });

  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + chartH);
  ctx.lineTo(padL + chartW, padT + chartH);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

export function renderPieChartImage(
  slices: { label: string; value: number }[],
  options?: { title?: string }
): string {
  const w = 400;
  const h = 280;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  if (options?.title) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px Helvetica, Arial, sans-serif";
    ctx.fillText(options.title, 16, 22);
  }

  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 130;
  const cy = options?.title ? 150 : 130;
  const r = 72;
  let start = -Math.PI / 2;

  slices.forEach((slice, i) => {
    const angle = (slice.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = BRAND.palette[i % BRAND.palette.length];
    ctx.fill();
    start += angle;
  });

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  slices.forEach((slice, i) => {
    const y = (options?.title ? 52 : 32) + i * 22;
    ctx.fillStyle = BRAND.palette[i % BRAND.palette.length];
    ctx.fillRect(230, y, 12, 12);
    ctx.fillStyle = "#334155";
    ctx.font = "11px Helvetica, Arial, sans-serif";
    const pct = Math.round((slice.value / total) * 100);
    ctx.fillText(`${slice.label} (${pct}%)`, 248, y + 10);
  });

  return canvas.toDataURL("image/png");
}

export function renderHealthGaugeImage(score: number, tier: string): string {
  const w = 320;
  const h = 120;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px Helvetica, Arial, sans-serif";
  ctx.fillText("Business Health Score", 16, 20);

  const barX = 16;
  const barY = 36;
  const barW = w - 32;
  const barH = 18;
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(barX, barY, barW, barH);

  const fillW = (score / 100) * barW;
  const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  gradient.addColorStop(0, BRAND.primary);
  gradient.addColorStop(1, BRAND.accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, barY, fillW, barH);

  ctx.fillStyle = BRAND.primary;
  ctx.font = "bold 22px Helvetica, Arial, sans-serif";
  ctx.fillText(`${score}/100`, 16, 82);
  ctx.font = "12px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(tier.replace(/_/g, " "), 100, 82);

  return canvas.toDataURL("image/png");
}

export function renderLineChartImage(
  labels: string[],
  values: number[],
  options?: { title?: string }
): string {
  const w = 520;
  const h = 240;
  const { canvas, ctx } = createCanvas(w, h);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  if (options?.title) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px Helvetica, Arial, sans-serif";
    ctx.fillText(options.title, 16, 22);
  }

  const padL = 40;
  const padR = 16;
  const padT = options?.title ? 36 : 16;
  const padB = 40;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const max = Math.max(...values, 1);
  const step = chartW / Math.max(values.length - 1, 1);

  ctx.strokeStyle = BRAND.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = padL + i * step;
    const y = padT + chartH - (v / max) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = `${BRAND.primary}22`;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = padL + i * step;
    const y = padT + chartH - (v / max) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(padL + (values.length - 1) * step, padT + chartH);
  ctx.lineTo(padL, padT + chartH);
  ctx.closePath();
  ctx.fill();

  labels.forEach((label, i) => {
    ctx.fillStyle = "#64748b";
    ctx.font = "9px Helvetica, Arial, sans-serif";
    ctx.fillText(label, padL + i * step - 8, h - 12);
  });

  return canvas.toDataURL("image/png");
}
