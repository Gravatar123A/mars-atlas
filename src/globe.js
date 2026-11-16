// Orthographic rendering of the published NASA Mars Trek MOLA color hillshade.
// Pixel color is a visual product; it is not a sampled numerical elevation.
let texture = null;
let sourcePixels = null;
let loading = null;
export async function loadGlobeTexture(url) {
  if (texture) return;
  if (!loading) loading = (async () => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    texture = { width: canvas.width, height: canvas.height };
    sourcePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  })();
  return loading;
}

export function globeSiteScreen(width, height, view, point) {
  const lon = view.lon * Math.PI / 180;
  const lat = view.lat * Math.PI / 180;
  const siteLon = point.lon * Math.PI / 180;
  const siteLat = point.lat * Math.PI / 180;
  const delta = siteLon - lon;
  const visibility = Math.sin(lat) * Math.sin(siteLat) + Math.cos(lat) * Math.cos(siteLat) * Math.cos(delta);
  if (visibility <= 0) return null;
  const radius = Math.min(width * .84, height * .9, 800) * view.zoom / 2;
  return { x: width / 2 + radius * Math.cos(siteLat) * Math.sin(delta), y: height / 2 - radius * (Math.cos(lat) * Math.sin(siteLat) - Math.sin(lat) * Math.cos(siteLat) * Math.cos(delta)) };
}

export function renderGlobe(canvas, view, sites = []) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const background = ctx.createRadialGradient(width * .5, height * .48, 10, width * .5, height * .5, Math.max(width, height) * .7);
  background.addColorStop(0, '#233c48');
  background.addColorStop(.55, '#0b1922');
  background.addColorStop(1, '#071019');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const diameter = Math.min(width * .84, height * .9, 800) * view.zoom;
  const radius = diameter / 2;
  const cx = width / 2, cy = height / 2;
  ctx.shadowColor = 'rgba(111,181,206,.32)';
  ctx.shadowBlur = 38;
  ctx.strokeStyle = '#75a3ad';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (!sourcePixels) {
    ctx.fillStyle = '#354c58';
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e5eff0'; ctx.font = '14px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Loading NASA MOLA surface…', cx, cy);
    return;
  }
  // Render at a bounded resolution so dragging stays responsive on laptops.
  const size = Math.min(640, Math.max(240, Math.round(diameter)));
  const offscreen = document.createElement('canvas');
  offscreen.width = offscreen.height = size;
  const off = offscreen.getContext('2d');
  const frame = off.createImageData(size, size);
  const dest = frame.data;
  const lon = view.lon * Math.PI / 180;
  const lat = view.lat * Math.PI / 180;
  const sinLon = Math.sin(lon), cosLon = Math.cos(lon);
  const sinLat = Math.sin(lat), cosLat = Math.cos(lat);
  for (let py = 0; py < size; py++) {
    const y = 1 - (py + .5) * 2 / size;
    for (let px = 0; px < size; px++) {
      const x = (px + .5) * 2 / size - 1;
      const rr = x * x + y * y;
      if (rr > 1) continue;
      const z = Math.sqrt(1 - rr);
      const wx = -x * sinLon - y * sinLat * cosLon + z * cosLat * cosLon;
      const wy = x * cosLon - y * sinLat * sinLon + z * cosLat * sinLon;
      const wz = y * cosLat + z * sinLat;
      const u = (Math.atan2(wy, wx) / (2 * Math.PI) + .5) * texture.width;
      const v = (.5 - Math.asin(Math.max(-1, Math.min(1, wz))) / Math.PI) * texture.height;
      const sx = Math.min(texture.width - 1, Math.max(0, u | 0));
      const sy = Math.min(texture.height - 1, Math.max(0, v | 0));
      const source = (sy * texture.width + sx) * 4;
      const target = (py * size + px) * 4;
      const light = Math.max(.32, Math.min(1.12, .55 + .52 * (z * .8 - x * .5 + y * .3)));
      dest[target] = Math.min(255, sourcePixels[source] * light);
      dest[target + 1] = Math.min(255, sourcePixels[source + 1] * light);
      dest[target + 2] = Math.min(255, sourcePixels[source + 2] * light);
      dest[target + 3] = 255;
    }
  }
  off.putImageData(frame, 0, 0);
  ctx.drawImage(offscreen, cx - radius, cy - radius, diameter, diameter);
  for (const site of sites) {
    const position = globeSiteScreen(width, height, view, site.point);
    if (!position) continue;
    const { x, y } = position;
    ctx.fillStyle = '#d9f2f5';
    ctx.strokeStyle = '#0a151b';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '600 11px Arial'; ctx.textAlign = 'left'; ctx.lineWidth = 3;
    ctx.strokeText(site.name, x + 10, y - 7);
    ctx.fillText(site.name, x + 10, y - 7);
  }
  ctx.fillStyle = '#b6ccd2';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.abs(view.lat).toFixed(1)}°${view.lat < 0 ? 'S' : 'N'}  ·  ${(((view.lon % 360) + 360) % 360).toFixed(1)}°E`, cx, Math.min(height - 14, cy + radius + 25));
}
