// Generates refined minimalist gallery-style compositions for sample slots
export function createArtDataUrl(seed, palette = ["#9E5A38", "#4A3222", "#E4D7C5"]) {
  const canvas = document.createElement("canvas");
  const w = 600;
  const h = 750;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  let s = seed * 7919 + 104729;
  const rand = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };

  // Archival linen base
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#F3ECE1");
  bg.addColorStop(1, "#E5D9C8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const primary = palette[0] || "#9E5A38";
  const dark = palette[1] || "#3B281E";
  const light = palette[2] || "#EFE5D8";

  // Subtle architectural / Rothko-inspired composition varied by seed
  const layout = seed % 3;

  if (layout === 1) {
    // Arch & horizon composition
    ctx.fillStyle = light;
    ctx.fillRect(64, 72, w - 128, h - 144);

    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.44, 155, Math.PI, 0);
    ctx.lineTo(w / 2 + 155, h * 0.72);
    ctx.lineTo(w / 2 - 155, h * 0.72);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = dark;
    ctx.fillRect(96, h * 0.64, w - 192, 110);
  } else if (layout === 2) {
    // Layered modernist color blocks
    ctx.fillStyle = dark;
    ctx.fillRect(72, 90, w - 144, 240);

    ctx.fillStyle = primary;
    ctx.fillRect(108, 355, w - 216, 175);

    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(w * 0.62, 210, 68, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Organic monolith & sun form
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.ellipse(w * 0.48, h * 0.52, 165, 220, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(w * 0.64, h * 0.3, 56, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine architectural hairline & signature mark
  ctx.strokeStyle = "rgba(30, 23, 19, 0.28)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(42, 42, w - 84, h - 84);

  ctx.beginPath();
  ctx.moveTo(42, h - 98);
  ctx.lineTo(w - 42, h - 98);
  ctx.stroke();

  // Subtle archival paper grain
  ctx.fillStyle = "rgba(30, 23, 19, 0.035)";
  for (let i = 0; i < 1600; i++) {
    const gx = rand() * w;
    const gy = rand() * h;
    ctx.fillRect(gx, gy, 1.5, 1.5);
  }

  return canvas.toDataURL();
}
