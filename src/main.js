import { cellAt, decodeTerrain, distanceMeters, planRoute, planRouteVia } from './terrain.js';

const $ = (selector) => document.querySelector(selector);
const app = $('#app');
const LANDING = { lat: 18.44463, lon: 77.45088 };
const HOGWALLOW_SOL464 = { lat: 18.44272865, lon: 77.38228798 };
const HOGWALLOW_SOURCE = 'https://science.nasa.gov/wp-content/uploads/2023/04/03_Ianson_Meyer_Gramling_MEP_MSR_TAGGED.pdf';
const SOL426_SOURCE = 'https://www.nasa.gov/wp-content/uploads/2021/09/final_msr_peis_nepa_scoping_meeting_presentations_may_4-5_2022.pdf';
const SCENARIO_KEY = 'mars-atlas-scenarios-v1';
const SITES = [
  { id: 'landing', name: 'Octavia E. Butler Landing', point: LANDING, type: 'Landing site', mission: 'Mars 2020 · Perseverance', significance: 'Documented landing position and starting area for crater-floor exploration.', note: 'A historical spacecraft location, not a validated EVA origin.', source: 'https://ntrs.nasa.gov/citations/20210024644' },
  { id: 'sol426', name: 'Perseverance at the Delta · Sol 426', point: { lat: 18.42416332, lon: 77.42524624 }, type: 'Rover position', mission: 'Mars 2020 · Perseverance', significance: 'NASA’s May 1, 2022 mission presentation places the rover at the delta during its second science campaign.', note: 'The cited point is a rover position, not an outcrop boundary or scored science target.', source: SOL426_SOURCE },
  { id: 'hogwallow', name: 'Hogwallow Flats · Sol 464', point: HOGWALLOW_SOL464, type: 'Rover position', mission: 'Mars 2020 · Perseverance', significance: 'Documented delta-front rover location used as the default research destination.', note: 'Historical rover position; route geometry is computed independently.', source: HOGWALLOW_SOURCE },
];
const MAP_LAYERS = {
  ctx: { id: 'JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0', maxZoom: 13, title: 'CTX controlled mosaic', mission: 'Mars Reconnaissance Orbiter', instrument: 'Context Camera', resolution: '6 m imagery', link: 'https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars', limitation: 'Orbital image brightness is not elevation or a measure of safe footing.' },
  hirise: { id: 'JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd', maxZoom: 17, title: 'HiRISE controlled mosaic', mission: 'Mars Reconnaissance Orbiter', instrument: 'HiRISE', resolution: '25 cm imagery', link: 'https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars', limitation: 'Detailed imagery does not establish terrain height or current surface safety.' },
  themis: { id: 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018', maxZoom: 9, title: 'THEMIS daytime IR mosaic', mission: 'Mars Odyssey', instrument: 'THEMIS', resolution: '100 m mosaic', link: 'https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars', limitation: 'Historical thermal infrared image, not live temperature or weather.' },
  mola: { id: 'Mars_MGS_MOLA_ClrShade_merge_global_463m', maxZoom: 7, extension: 'jpg', title: 'MOLA color hillshade', mission: 'Mars Global Surveyor', instrument: 'MOLA', resolution: '463 m visual product', link: 'https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars', limitation: 'Rendered hillshade is visual context, not the numeric DEM used for routing.' },
};

const state = {
  grid: null,
  regionalGrid: null,
  center: { lat: 18.458, lon: 77.430 },
  zoom: 9,
  basemap: 'ctx',
  hirise: false,
  themis: false,
  themisOpacity: 0.45,
  hiriseOpacity: 0.72,
  pick: 'destination',
  start: LANDING,
  destination: HOGWALLOW_SOL464,
  waypoint: null,
  maxSlope: 5,
  speed: 0.75,
  timeBudgetMinutes: 120,
  routes: {},
  selectedRoute: 'conservative',
  activeEvidence: 'dem',
  viewMode: 'map',
  terrainMesh: null,
  regionalMesh: null,
  terrainScope: 'local',
  terrainView: { yaw: -0.72, pitch: 0.82, zoom: 1, exaggeration: 6 },
  terrainPointer: null,
  terrainFrame: null,
  pointer: null,
};

const fmt = {
  coord: (n) => Number(n).toFixed(5),
  distance: (n) => n >= 1000 ? `${(n / 1000).toFixed(2)} km` : `${Math.round(n)} m`,
  height: (n) => `${Math.round(n)} m`,
  minutes: (n) => n >= 60 ? `${Math.floor(n / 60)} h ${Math.round(n % 60)} m` : `${Math.round(n)} min`,
};

function el(html) { const div = document.createElement('div'); div.innerHTML = html.trim(); return div.firstElementChild; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">✦</span><span>MARS<span class="brand-slash">//</span>ATLAS</span><span class="brand-sub">MISSION INTELLIGENCE</span></div>
      <div class="topbar-center"><span class="signal-dot"></span> JEZERO CRATER <span class="top-sep">/</span> MARS 2020 STUDY AREA</div>
      <div class="topbar-actions"><span class="prototype-pill">RESEARCH PROTOTYPE</span><button id="exportBtn" class="top-button">↓ <span>Export brief</span></button></div>
    </header>
    <div class="workspace">
      <aside class="side left-side">
        <div class="panel-scroll">
          <div class="section-eyebrow">01 / MISSION SETUP</div>
          <h1>Plan a Marswalk<span class="title-period">.</span></h1>
          <p class="intro">Explore real orbital observations. Compare routes across measured terrain and inspect the evidence behind each decision.</p>
          <div class="divider"></div>
          <div class="field-heading"><span>STARTING POINT</span><button class="text-button" id="landingBtn">Use landing site ↗</button></div>
          <div class="point-input"><span class="point-icon start-icon"></span><div><strong id="startLabel">Octavia E. Butler Landing</strong><small id="startCoords"></small></div><button id="pickStart" aria-label="Choose start on map">◎</button></div>
          <div class="field-heading destination-heading"><span>DESTINATION</span><button class="text-button" id="roverBtn">Use Sol 464 location ↗</button></div>
          <div class="point-input"><span class="point-icon dest-icon"></span><div><strong id="destLabel">Hogwallow Flats · Sol 464</strong><small id="destCoords"></small></div><button id="pickDestination" aria-label="Choose destination on map">◎</button></div>
          <a class="point-source" href="${HOGWALLOW_SOURCE}" target="_blank" rel="noopener">NASA record for this rover location ↗</a>
          <div class="field-heading destination-heading"><span>OPTIONAL WAYPOINT</span><button class="text-button" id="clearWaypoint">Clear stop</button></div>
          <div class="point-input"><span class="point-icon waypoint-icon"></span><div><strong id="waypointLabel">No intermediate stop</strong><small id="waypointCoords">Add a map point to compare a route through it</small></div><button id="pickWaypoint" aria-label="Choose waypoint on map">◎</button></div>
          <div class="pick-hint" id="pickHint">Click the map to choose a destination. Routes require measured terrain coverage.</div>
          <div id="coverageInfo" class="coverage-info">Loading measured terrain footprint…</div>
          <details class="coordinate-details"><summary>Enter precise coordinates</summary><div class="coordinate-form"><label>Latitude (°N)<input id="latInput" type="number" step="0.00001" min="-90" max="90"></label><label>Longitude (°E)<input id="lonInput" type="number" step="0.00001" min="-180" max="180"></label><button id="applyCoords" class="outline-button">Set selected point</button></div></details>
          <div class="divider"></div>
          <div class="section-title-row"><div><div class="section-eyebrow">02 / CONSTRAINTS</div><h2>Mission parameters</h2></div><span class="model-tag">MODEL</span></div>
          <div class="slider-label"><label for="slopeRange">Maximum segment slope</label><strong id="slopeValue">5.0°</strong></div>
          <input id="slopeRange" class="range" type="range" min="0.1" max="35" step="0.1" value="5">
          <div class="range-ends"><span>STRICT 0.1°</span><span>PERMISSIVE 35°</span></div>
          <div class="model-note">Hard limit on the slope between adjacent 20 m DEM cells. Smaller rocks and local hazards remain unknown.</div>
          <div class="slider-label speed-label"><label for="speedRange">Assumed walking speed</label><strong id="speedValue">0.75 m/s</strong></div>
          <input id="speedRange" class="range" type="range" min="0.2" max="1.5" step="0.05" value="0.75">
          <div class="model-note">Used for a simple one-way travel-time estimate; it does not model EVA operations.</div>
          <div class="slider-label speed-label"><label for="budgetRange">One-way time budget</label><strong id="budgetValue">2 h 0 m</strong></div>
          <input id="budgetRange" class="range" type="range" min="30" max="480" step="15" value="120">
          <div class="model-note">Hypothetical planning threshold. It excludes stops, return travel, and EVA operations.</div>
          <button class="primary-button" id="calculateBtn"><span>Calculate route alternatives</span><span>→</span></button>
          <div id="routeStatus" class="status-line" role="status">Loading NASA terrain data…</div>
          <details class="saved-plans"><summary>Saved mission plans</summary><div class="saved-plans-body"><label for="scenarioName">Plan name</label><input id="scenarioName" type="text" maxlength="50" placeholder="e.g. Delta traverse"><button class="outline-button" id="saveScenario">Save current plan</button><div id="savedScenarioList" class="saved-scenario-list">No plans saved in this browser.</div><small>Plans stay in this browser. Restoring a plan recalculates its routes from the checked-in terrain grid.</small></div></details>
          <div class="divider"></div>
          <div class="section-eyebrow">03 / SURFACE LAYERS</div><h2>Observe the terrain</h2>
          <div class="layer-choice"><label><input type="radio" name="basemap" value="ctx" checked><span class="swatch ctx-swatch"></span><span>CTX imagery<small>MRO · 6 m mosaic</small></span></label><button class="info-button" data-evidence="ctx" aria-label="CTX source information">i</button></div>
          <div class="layer-choice"><label><input type="radio" name="basemap" value="mola"><span class="swatch mola-swatch"></span><span>MOLA hillshade<small>MGS · regional context</small></span></label><button class="info-button" data-evidence="mola" aria-label="MOLA source information">i</button></div>
          <div class="layer-choice"><label><input id="hiriseToggle" type="checkbox"><span class="swatch hirise-swatch"></span><span>HiRISE detail<small>MRO · 25 cm mosaic</small></span></label><button class="info-button" data-evidence="hirise" aria-label="HiRISE source information">i</button></div>
          <div class="opacity-row"><span>HiRISE opacity</span><input id="hiriseOpacity" type="range" min="0" max="100" value="72"><span id="hiriseOpacityLabel">72%</span></div>
          <div class="layer-choice"><label><input id="themisToggle" type="checkbox"><span class="swatch themis-swatch"></span><span>THEMIS daytime IR<small>Mars Odyssey · historical</small></span></label><button class="info-button" data-evidence="themis" aria-label="THEMIS source information">i</button></div>
          <div class="opacity-row"><span>THEMIS opacity</span><input id="themisOpacity" type="range" min="0" max="100" value="45"><span id="themisOpacityLabel">45%</span></div>
        </div>
      </aside>
      <main class="main-area">
        <div class="map-topline"><span class="map-live"><span class="signal-dot"></span> JEZERO / OBSERVATION SPACE</span><div class="view-mode" role="group" aria-label="Terrain view"><button class="active" data-view="map" aria-pressed="true">2D imagery</button><button data-view="terrain" aria-pressed="false" disabled>3D elevation</button></div><button id="toggleInspector" class="inspector-toggle" aria-expanded="false" aria-controls="sourceInspector">Evidence & analysis</button><span id="cursorCoords">18.45800°N / 77.43000°E</span></div>
        <div id="map" class="map" tabindex="0" aria-label="Interactive Jezero Crater map. Use arrow keys to pan and plus or minus to zoom.">
          <div id="tileLayers" class="tile-layers"></div>
          <canvas id="terrain3d" class="terrain-canvas" role="img" aria-label="Three dimensional elevation rendering of the verified CTX terrain grid" hidden></canvas>
          <svg id="routeOverlay" class="route-overlay" aria-hidden="true"></svg>
          <div class="map-vignette"></div>
          <div class="map-controls"><button id="zoomIn" aria-label="Zoom in">+</button><button id="zoomOut" aria-label="Zoom out">−</button><button id="resetMap" aria-label="Fit route terrain">⌖</button><button id="fitRegion" aria-label="Explore wider Jezero region in 2D" title="Explore wider Jezero region in 2D" disabled>◈</button><button id="focusRoute" aria-label="Focus route endpoints">↗</button><button id="fullscreenMap" aria-label="Toggle full screen map">⛶</button></div>
          <div class="map-badge">MARS / JEZERO <span>·</span> PLANETOCENTRIC · EAST POSITIVE</div>
          <div class="scale-box"><div id="scaleLine"></div><span id="scaleText">—</span></div>
          <div class="coverage-key"><span class="coverage-line"></span> <span id="coverageKeyText">CTX DEM MEASURED AREA</span> <span class="coverage-fill"></span> NUMERIC ELEVATION</div>
          <div id="terrain3dLegend" class="terrain-legend" hidden><div><span class="terrain-mode-chip">3D / CTX DEM</span><strong id="terrainScopeTitle">Measured terrain</strong><small id="terrainMeshNote">Left drag to orbit · Scroll to zoom · vertical scale 6×</small><small id="terrainColorNote">Elevation tint from measured terrain; no photo texture</small><div class="terrain-scope" role="group" aria-label="3D terrain area"><button data-scope="local" class="active" aria-pressed="true">Landing area</button><button data-scope="regional" aria-pressed="false" disabled>Jezero region</button></div><a id="terrainSourceLink" href="https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/index.html" target="_blank" rel="noopener">USGS terrain source ↗</a></div><button id="resetTerrain" aria-label="Reset 3D terrain view">Reset view</button></div>
          <div id="mapAttribution" class="map-attribution">Imagery: NASA Mars Trek · MRO / Mars Odyssey / MGS</div>
        </div>
        <div class="results-bar"><div class="results-title"><span class="section-eyebrow">04 / ROUTE COMPARISON</span><h2>Decision engine <span id="routeCount" class="route-count">0 routes</span></h2></div><div id="comparisonNote" class="comparison-note">Compute routes to compare distance and terrain trade-offs.</div></div>
        <div id="routeCards" class="route-cards"></div>
      </main>
      <aside class="side right-side" id="sourceInspector" aria-hidden="true" inert>
        <div class="panel-scroll">
          <button id="closeInspector" class="inspector-close" aria-label="Close evidence and analysis">×</button>
          <div class="section-eyebrow">MISSION / OVERVIEW</div>
          <div id="missionOverview" class="mission-overview"></div>
          <div class="divider"></div>
          <div class="section-eyebrow">EVIDENCE / SOURCE INSPECTOR</div>
          <h2>Know what the map knows<span class="title-period">.</span></h2>
          <p class="side-intro">Every number in the route model begins with an identified dataset or a stated assumption.</p>
          <div class="source-tabs"><button data-evidence="dem" class="active">Route DEM</button><button data-evidence="regional">Regional DEM</button><button data-evidence="ctx">Imagery</button><button data-evidence="themis">Thermal</button></div>
          <div id="evidenceCard"></div>
          <div class="divider"></div>
          <div class="section-eyebrow">CURRENT ROUTE / ANALYSIS</div>
          <div id="routeInsight" class="route-insight"><div class="empty-icon">⌁</div><strong>Awaiting a route</strong><p>Calculate alternatives to inspect measured elevation and modelled slope.</p></div>
          <details class="route-table-details"><summary>Route metrics table</summary><table><caption>Computed route comparison</caption><thead><tr><th scope="col">Profile</th><th scope="col">Distance</th><th scope="col">Max slope</th><th scope="col">Ascent</th></tr></thead><tbody id="routeTableBody"><tr><td colspan="4">Calculate routes to populate this table.</td></tr></tbody></table></details>
          <div class="divider"></div>
          <div class="section-eyebrow">SCIENCE CONTEXT</div>
          <div class="science-card"><div class="science-icon">✧</div><div><strong>Delta-front science</strong><p>NASA documents Perseverance at Hogwallow Flats on Sol 464 (June 10, 2022), near the ancient delta. Sedimentary rocks there help investigate Jezero's past lake environment. The route is a research scenario between documented coordinates, not a recreation of the rover's traverse.</p><a href="${HOGWALLOW_SOURCE}" target="_blank" rel="noopener">Open NASA location record ↗</a></div></div>
          <div class="divider"></div>
          <div class="section-eyebrow">VERIFIED / DESTINATIONS</div>
          <h2>Explore cited sites<span class="title-period">.</span></h2>
          <label class="site-search-label" for="siteSearch">Search documented positions</label><input id="siteSearch" class="site-search" type="search" placeholder="Search site, mission, or type">
          <div id="siteList" class="site-list"></div>
          <div class="trust-note"><strong>Independent research prototype</strong><p>MARS//ATLAS is not an official NASA operational tool or certified human-exploration navigation system. Orbital DEM cells cannot resolve every local hazard.</p></div>
        </div>
      </aside>
    </div>
  </div>`;

function world(point, zoom) {
  const scale = 256 * 2 ** zoom;
  return { x: (point.lon + 180) / 360 * scale * 2, y: (90 - point.lat) / 180 * scale };
}

function screen(point) {
  const map = $('#map');
  const p = world(point, state.zoom);
  const c = world(state.center, state.zoom);
  return { x: p.x - c.x + map.clientWidth / 2, y: p.y - c.y + map.clientHeight / 2 };
}

function fromScreen(x, y) {
  const map = $('#map');
  const c = world(state.center, state.zoom);
  const scale = 256 * 2 ** state.zoom;
  return { lon: ((c.x + x - map.clientWidth / 2) / (scale * 2)) * 360 - 180, lat: 90 - ((c.y + y - map.clientHeight / 2) / scale) * 180 };
}

function fitPoints(points, fill = .78) {
  const map = $('#map');
  if (!map.clientWidth || !map.clientHeight || !points.length) return;
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lon);
  const north = Math.max(...latitudes), south = Math.min(...latitudes);
  const east = Math.max(...longitudes), west = Math.min(...longitudes);
  state.center = { lat: (north + south) / 2, lon: (east + west) / 2 };
  state.zoom = 7;
  for (let zoomLevel = 16; zoomLevel >= 7; zoomLevel--) {
    const a = world({ lat: north, lon: west }, zoomLevel);
    const b = world({ lat: south, lon: east }, zoomLevel);
    if (b.x - a.x <= map.clientWidth * fill && b.y - a.y <= map.clientHeight * fill) {
      state.zoom = zoomLevel;
      break;
    }
  }
  drawTiles();
}

function fitGrid(grid) {
  if (!grid) return;
  fitPoints([
    { lat: grid.northCenterLat + grid.degreesPerPixelLat / 2, lon: grid.westCenterLon - grid.degreesPerPixelLon / 2 },
    { lat: grid.northCenterLat - (grid.height - .5) * grid.degreesPerPixelLat, lon: grid.westCenterLon + (grid.width - .5) * grid.degreesPerPixelLon },
  ]);
}
function fitCoverage() { fitGrid(state.grid); }

function fitRegion() {
  if (!state.regionalGrid) return;
  state.basemap = 'mola';
  document.querySelector('input[name="basemap"][value="mola"]').checked = true;
  setViewMode('map');
  fitGrid(state.regionalGrid);
}

function focusRoute() {
  const route = state.routes[state.selectedRoute];
  fitPoints(route?.points || [state.start, state.destination, ...(state.waypoint ? [state.waypoint] : [])]);
}

function drawTiles() {
  const map = $('#map');
  const container = $('#tileLayers');
  if (!map.clientWidth || !map.clientHeight) return;
  container.replaceChildren();
  const visible = state.basemap === 'ctx' ? [{ key: 'mola', opacity: 1 }, { key: 'ctx', opacity: 1 }] : [{ key: 'mola', opacity: 1 }];
  if (state.hirise) visible.push({ key: 'hirise', opacity: state.hiriseOpacity });
  if (state.themis) visible.push({ key: 'themis', opacity: state.themisOpacity });
  for (const { key, opacity } of visible) {
    const layer = MAP_LAYERS[key];
    const z = Math.min(state.zoom, layer.maxZoom);
    const factor = 2 ** (state.zoom - z);
    const center = world(state.center, z);
    const halfW = map.clientWidth / (2 * factor);
    const halfH = map.clientHeight / (2 * factor);
    const c0 = Math.max(0, Math.floor((center.x - halfW) / 256) - 1);
    const c1 = Math.min(2 ** (z + 1) - 1, Math.floor((center.x + halfW) / 256) + 1);
    const r0 = Math.max(0, Math.floor((center.y - halfH) / 256) - 1);
    const r1 = Math.min(2 ** z - 1, Math.floor((center.y + halfH) / 256) + 1);
    const group = el(`<div class="tile-group ${key === 'mola' && state.basemap === 'ctx' ? 'context-backdrop' : ''}" style="opacity:${opacity}"></div>`);
    for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) {
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.loading = 'lazy';
      img.addEventListener('error', () => img.remove(), { once: true });
      img.src = `https://trek.nasa.gov/tiles/Mars/EQ/${layer.id}/1.0.0/default/default028mm/${z}/${row}/${col}.${layer.extension || 'png'}`;
      img.style.left = `${(col * 256 - center.x) * factor + map.clientWidth / 2}px`;
      img.style.top = `${(row * 256 - center.y) * factor + map.clientHeight / 2}px`;
      img.style.width = `${256 * factor + 0.5}px`;
      img.style.height = `${256 * factor + 0.5}px`;
      group.append(img);
    }
    container.append(group);
  }
  drawOverlay();
  drawScale();
  scheduleTerrainRender();
}

function buildTerrainMesh(grid) {
  const stride = Math.max(1, Math.ceil(Math.max(grid.width / 108, grid.height / 100)));
  const columns = [];
  const rows = [];
  for (let col = 0; col < grid.width; col += stride) columns.push(col);
  for (let row = 0; row < grid.height; row += stride) rows.push(row);
  if (columns.at(-1) !== grid.width - 1) columns.push(grid.width - 1);
  if (rows.at(-1) !== grid.height - 1) rows.push(grid.height - 1);
  const samples = [];
  let minimum = Infinity, maximum = -Infinity;
  for (const row of rows) for (const col of columns) {
    const elevation = grid.elevationsMeters[row * grid.width + col];
    samples.push({ row, col, elevation });
    if (Number.isFinite(elevation)) { minimum = Math.min(minimum, elevation); maximum = Math.max(maximum, elevation); }
  }
  const span = Math.max(1, maximum - minimum);
  const longestSide = Math.max(grid.width, grid.height);
  const xScale = grid.width / longestSide;
  const zScale = grid.height / longestSide;
  const vertices = samples.map((sample) => ({
    ...sample,
    x: ((sample.col / (grid.width - 1)) * 2 - 1) * xScale,
    z: ((sample.row / (grid.height - 1)) * 2 - 1) * zScale,
    y: 2 * (sample.elevation - (minimum + maximum) / 2) / (longestSide * grid.resolutionMeters),
  }));
  const faces = [];
  const count = columns.length;
  for (let row = 0; row < rows.length - 1; row++) for (let col = 0; col < columns.length - 1; col++) {
    const a = row * count + col, b = a + 1, c = a + count, d = c + 1;
    if ([a, c, b].every((index) => Number.isFinite(vertices[index].elevation))) faces.push([a, c, b]);
    if ([b, c, d].every((index) => Number.isFinite(vertices[index].elevation))) faces.push([b, c, d]);
  }
  return { vertices, faces, minimum, maximum, span, xScale, zScale, stride };
}

function terrainPosition(point) {
  const grid = activeTerrainGrid();
  const mesh = activeTerrainMesh();
  const col = Math.max(0, Math.min(grid.width - 1, Math.round((point.lon - grid.westCenterLon) / grid.degreesPerPixelLon)));
  const row = Math.max(0, Math.min(grid.height - 1, Math.round((grid.northCenterLat - point.lat) / grid.degreesPerPixelLat)));
  const localIndex = state.grid && cellAt(state.grid, point);
  const localElevation = localIndex !== null ? state.grid.elevationsMeters[localIndex] : NaN;
  const sampledElevation = grid.elevationsMeters[row * grid.width + col];
  const elevation = Number.isFinite(localElevation) ? localElevation : Number.isFinite(sampledElevation) ? sampledElevation : mesh.minimum;
  return {
    x: ((col / (grid.width - 1)) * 2 - 1) * mesh.xScale,
    z: ((row / (grid.height - 1)) * 2 - 1) * mesh.zScale,
    y: 2 * (elevation - (mesh.minimum + mesh.maximum) / 2) / (Math.max(grid.width, grid.height) * grid.resolutionMeters),
  };
}

function projectTerrain(position, width, height) {
  const { yaw, pitch, zoom, exaggeration } = state.terrainView;
  const cosYaw = Math.cos(yaw), sinYaw = Math.sin(yaw);
  const x = position.x * cosYaw - position.z * sinYaw;
  const z = position.x * sinYaw + position.z * cosYaw;
  const y = position.y * exaggeration;
  const cosPitch = Math.cos(pitch), sinPitch = Math.sin(pitch);
  const rise = y * cosPitch - z * sinPitch;
  const depth = y * sinPitch + z * cosPitch;
  const scale = Math.min(width, height) * 0.5 * zoom;
  return { x: width / 2 + x * scale, y: height * 0.57 - rise * scale, depth };
}

function terrainColor(normalizedElevation, illumination) {
  const stops = [
    [20, 38, 52], [52, 67, 75], [125, 73, 55], [193, 104, 68], [239, 183, 122],
  ];
  const scaled = Math.max(0, Math.min(stops.length - 1.001, normalizedElevation * (stops.length - 1)));
  const index = Math.floor(scaled), portion = scaled - index;
  const a = stops[index], b = stops[Math.min(stops.length - 1, index + 1)];
  const shade = 0.52 + Math.max(0, illumination) * 0.48;
  return `rgb(${Math.round((a[0] + (b[0] - a[0]) * portion) * shade)},${Math.round((a[1] + (b[1] - a[1]) * portion) * shade)},${Math.round((a[2] + (b[2] - a[2]) * portion) * shade)})`;
}

function drawTerrainRoute(ctx, width, height, route, color, active) {
  if (!route?.points?.length) return;
  const points = route.points.map((point) => projectTerrain(terrainPosition(point), width, height));
  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = active ? 4.5 : 2.2;
  ctx.globalAlpha = active ? 1 : 0.68;
  ctx.shadowColor = color;
  ctx.shadowBlur = active ? 14 : 5;
  ctx.stroke();
  ctx.restore();
}

function drawTerrainMarker(ctx, width, height, point, color, label) {
  if (cellAt(state.grid, point) === null) return;
  const p = projectTerrain(terrainPosition(point), width, height);
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f4f0e8';
  ctx.font = '700 10px Space Grotesk, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(label, p.x + 11, p.y - 11);
  ctx.restore();
}

function renderTerrain3d() {
  state.terrainFrame = null;
  if (state.viewMode !== 'terrain' || !activeTerrainMesh() || !activeTerrainGrid()) return;
  const canvas = $('#terrain3d');
  const map = $('#map');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, map.clientWidth), height = Math.max(1, map.clientHeight);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#071018'); background.addColorStop(.5, '#101f2a'); background.addColorStop(1, '#2c1c1a');
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  const mesh = activeTerrainMesh();
  const projected = mesh.vertices.map((vertex) => projectTerrain(vertex, width, height));
  const ordered = mesh.faces.map(([a, b, c]) => ({ a, b, c, depth: (projected[a].depth + projected[b].depth + projected[c].depth) / 3 })).sort((left, right) => left.depth - right.depth);
  for (const face of ordered) {
    const va = mesh.vertices[face.a], vb = mesh.vertices[face.b], vc = mesh.vertices[face.c];
    const ux = vb.x - va.x, uy = vb.y - va.y, uz = vb.z - va.z;
    const vx = vc.x - va.x, vy = vc.y - va.y, vz = vc.z - va.z;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const magnitude = Math.hypot(nx, ny, nz) || 1;
    const illumination = (nx * -.38 + ny * .82 + nz * -.42) / magnitude;
    const elevation = (va.elevation + vb.elevation + vc.elevation) / 3;
    ctx.beginPath();
    ctx.moveTo(projected[face.a].x, projected[face.a].y);
    ctx.lineTo(projected[face.b].x, projected[face.b].y);
    ctx.lineTo(projected[face.c].x, projected[face.c].y);
    ctx.closePath();
    ctx.fillStyle = terrainColor((elevation - mesh.minimum) / mesh.span, illumination);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(210,235,235,.08)';
  ctx.lineWidth = .45;
  for (let i = 0; i < mesh.faces.length; i += 8) {
    const [a, b, c] = mesh.faces[i];
    ctx.beginPath(); ctx.moveTo(projected[a].x, projected[a].y); ctx.lineTo(projected[b].x, projected[b].y); ctx.lineTo(projected[c].x, projected[c].y); ctx.closePath(); ctx.stroke();
  }
  drawTerrainRoute(ctx, width, height, state.routes.shortest, '#f0b36f', state.selectedRoute === 'shortest');
  drawTerrainRoute(ctx, width, height, state.routes.conservative, '#7be4d0', state.selectedRoute === 'conservative');
  drawTerrainRoute(ctx, width, height, state.routes.waypoint, '#dca9ef', state.selectedRoute === 'waypoint');
  drawTerrainMarker(ctx, width, height, state.start, '#f2b66f', 'START');
  drawTerrainMarker(ctx, width, height, state.destination, '#82e1cf', 'DESTINATION');
  if (state.waypoint) drawTerrainMarker(ctx, width, height, state.waypoint, '#dca9ef', 'WAYPOINT');
}

function scheduleTerrainRender() {
  if (state.viewMode !== 'terrain' || !activeTerrainMesh() || state.terrainFrame) return;
  state.terrainFrame = requestAnimationFrame(renderTerrain3d);
}

function activeTerrainGrid() { return state.terrainScope === 'regional' && state.regionalGrid ? state.regionalGrid : state.grid; }
function activeTerrainMesh() { return state.terrainScope === 'regional' && state.regionalMesh ? state.regionalMesh : state.terrainMesh; }

function setTerrainScope(scope) {
  if (scope === 'regional' && !state.regionalMesh) return;
  state.terrainScope = scope;
  const grid = activeTerrainGrid(), mesh = activeTerrainMesh();
  $('#terrainScopeTitle').textContent = scope === 'regional' ? 'Jezero regional terrain' : 'Landing-area terrain';
  $('#terrainMeshNote').textContent = `Left drag to orbit · ${(mesh.stride * grid.resolutionMeters).toLocaleString()} m visual samples · vertical scale 6×`;
  $('#terrainColorNote').textContent = `Elevation tint: ${Math.round(mesh.minimum).toLocaleString()} to ${Math.round(mesh.maximum).toLocaleString()} m · no photo texture`;
  $('#terrainSourceLink').href = grid.productPage;
  document.querySelectorAll('[data-scope]').forEach((button) => { const active = button.dataset.scope === scope; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  resetTerrainView();
}

function resetTerrainView() {
  state.terrainView = { yaw: -0.72, pitch: 0.82, zoom: 1, exaggeration: 6 };
  scheduleTerrainRender();
}

function updateCoverageInfo() {
  if (!state.grid) return;
  const local = state.grid;
  const widthKm = local.width * local.resolutionMeters / 1000;
  const heightKm = local.height * local.resolutionMeters / 1000;
  const regional = state.regionalGrid;
  $('#coverageInfo').innerHTML = `Measured CTX route terrain: ${widthKm.toFixed(1)} × ${heightKm.toFixed(1)} km · ${(local.width * local.height).toLocaleString()} cells. ${state.viewMode === 'terrain' ? 'Switch to 2D to select points.' : 'Use ⌖ to fit the route footprint or ↗ to focus your route.'}${regional ? `<br>Broader Jezero CTX DEM: ${(regional.width * regional.resolutionMeters / 1000).toFixed(1)} × ${(regional.height * regional.resolutionMeters / 1000).toFixed(1)} km. Source cells are 20 m; the regional package samples at 80 m, with a coarser visual mesh. Use ◈ for 2D overview or Jezero region in 3D. Routes use the 20 m landing grid.` : ''}`;
}

function setViewMode(mode) {
  if (mode === 'terrain' && !state.terrainMesh) return;
  state.viewMode = mode;
  const terrain = mode === 'terrain';
  $('#terrain3d').hidden = !terrain;
  $('#terrain3dLegend').hidden = !terrain;
  $('#routeOverlay').style.display = terrain ? 'none' : '';
  $('#map').classList.toggle('terrain-active', terrain);
  $('#pickHint').textContent = terrain ? 'Orbit the CTX elevation surface. Switch to 2D imagery to select a route point; calculated routes appear in both views.' : `Click the map to choose ${state.pick === 'start' ? 'a starting point' : state.pick === 'waypoint' ? 'an intermediate waypoint' : 'a destination'}. Routing requires the measured CTX terrain footprint; outside points remain selectable for exploration.`;
  $('#map').setAttribute('aria-label', terrain ? 'Three dimensional CTX elevation view. Drag to orbit and use plus or minus to zoom.' : 'Interactive Jezero Crater map. Use arrow keys to pan and plus or minus to zoom.');
  document.querySelectorAll('[data-view]').forEach((button) => { const active = button.dataset.view === mode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $('#cursorCoords').textContent = terrain ? '3D elevation / CTX DEM' : `${fmt.coord(state.center.lat)}°N / ${fmt.coord(state.center.lon)}°E`;
  $('#mapAttribution').textContent = terrain ? 'Terrain: USGS MRO / CTX DEM · sampled visual mesh' : 'Imagery: NASA Mars Trek · MRO / Mars Odyssey / MGS';
  updateCoverageInfo();
  drawOverlay();
  scheduleTerrainRender();
}

function svgPath(points) {
  return points.map((point, i) => { const p = screen(point); return `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
}

function drawOverlay() {
  const svg = $('#routeOverlay');
  const map = $('#map');
  if (state.viewMode === 'terrain') { svg.innerHTML = ''; scheduleTerrainRender(); return; }
  svg.setAttribute('viewBox', `0 0 ${map.clientWidth} ${map.clientHeight}`);
  const routes = Object.entries(state.routes).filter(([, route]) => route?.points);
  const paths = routes.map(([key, route]) => {
    const active = key === state.selectedRoute;
    const color = key === 'shortest' ? '#e8ad71' : key === 'waypoint' ? '#dcb5ef' : '#8cddcd';
    const path = svgPath(route.points);
    return `<path d="${path}" class="route-glow ${key}" fill="none" stroke="${color}" stroke-width="${active ? 9 : 6}" stroke-linecap="round" stroke-linejoin="round" opacity="${active ? .22 : .1}"/><path d="${path}" class="route-line ${key} ${active ? 'active' : ''}" fill="none" stroke="${color}" stroke-width="${active ? 4 : 2.4}" stroke-linecap="round" stroke-linejoin="round" opacity="${active ? 1 : 0.72}"/>`;
  }).join('');
  const markers = [
    { point: state.start, color: '#e8ad71', label: 'START' },
    { point: state.destination, color: '#8cddcd', label: 'DESTINATION' },
    ...(state.waypoint ? [{ point: state.waypoint, color: '#dcb5ef', label: 'WAYPOINT' }] : []),
  ].map(({ point, color, label }) => { const p = screen(point); return `<g><circle cx="${p.x}" cy="${p.y}" r="12" fill="${color}" opacity=".18"/><circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="#101820" stroke-width="2"/><text x="${p.x + 13}" y="${p.y - 10}" fill="#f7f3eb" font-size="10" font-weight="700" letter-spacing="1.5" paint-order="stroke" stroke="#111a20" stroke-width="3">${label}</text></g>`; }).join('');
  const grid = state.grid;
  let bounds = '';
  if (grid) {
    const a = screen({ lat: grid.northCenterLat + grid.degreesPerPixelLat / 2, lon: grid.westCenterLon - grid.degreesPerPixelLon / 2 });
    const b = screen({ lat: grid.northCenterLat - (grid.height - .5) * grid.degreesPerPixelLat, lon: grid.westCenterLon + (grid.width - .5) * grid.degreesPerPixelLon });
    bounds = `<rect x="${a.x}" y="${a.y}" width="${b.x - a.x}" height="${b.y - a.y}" fill="#74d8c1" fill-opacity=".035" stroke="#74d8c1" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="7 6"/>`;
  }
  svg.innerHTML = bounds + paths + markers;
}

function drawScale() {
  const a = fromScreen(0, 0);
  const b = fromScreen(100, 0);
  const meters = distanceMeters(a, b, state.grid?.radiusMeters || 3396190);
  const nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter((n) => n <= meters * 1.3).at(-1) || 10;
  $('#scaleLine').style.width = `${100 * nice / meters}px`;
  $('#scaleText').textContent = fmt.distance(nice);
}

function setPoint(kind, point) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180 || !state.grid) {
    setStatus('Enter a valid Mars latitude and longitude.', 'error');
    return false;
  }
  const sameStop = (a, b) => {
    const first = cellAt(state.grid, a), second = cellAt(state.grid, b);
    return first !== null && second !== null ? first === second : distanceMeters(a, b, state.grid.radiusMeters) < 10;
  };
  if ((kind === 'start' && (sameStop(point, state.destination) || (state.waypoint && sameStop(point, state.waypoint)))) ||
      (kind === 'destination' && (sameStop(point, state.start) || (state.waypoint && sameStop(point, state.waypoint)))) ||
      (kind === 'waypoint' && [state.start, state.destination].some((other) => sameStop(point, other)))) {
    setStatus('Choose a different terrain cell for each route stop.', 'error');
    return false;
  }
  state[kind] = point;
  invalidateRoutes();
  updatePointLabels();
  renderSites();
  drawOverlay();
  const cell = cellAt(state.grid, point);
  const covered = cell !== null && Number.isFinite(state.grid.elevationsMeters[cell]);
  setStatus(covered ? `${kind === 'start' ? 'Start' : kind === 'waypoint' ? 'Waypoint' : 'Destination'} set. Calculate to update routes.` : 'Point set for map exploration. Numerical routing is unavailable outside the CTX DEM.', covered ? 'ready' : 'error');
  return true;
}

function invalidateRoutes() {
  calculationRevision++;
  state.routes = {};
  $('#routeCards').innerHTML = '';
  $('#routeCount').textContent = '0 routes';
  $('#comparisonNote').textContent = 'Points changed. Calculate routes to update the comparison.';
  $('#routeInsight').innerHTML = '<div class="empty-icon">⌁</div><strong>Awaiting a route</strong><p>Calculate alternatives for the current points.</p>';
  $('#routeTableBody').innerHTML = '<tr><td colspan="4">Calculate routes to populate this table.</td></tr>';
  updateOverview();
}

function updatePointLabels() {
  $('#startCoords').textContent = `${fmt.coord(state.start.lat)}°N  ${fmt.coord(state.start.lon)}°E`;
  $('#destCoords').textContent = `${fmt.coord(state.destination.lat)}°N  ${fmt.coord(state.destination.lon)}°E`;
  $('#startLabel').textContent = distanceMeters(state.start, LANDING) < 15 ? 'Octavia E. Butler Landing' : 'Selected map point';
  $('#destLabel').textContent = SITES.find((site) => distanceMeters(state.destination, site.point) < 15)?.name || 'Selected map point';
  $('#waypointLabel').textContent = state.waypoint ? SITES.find((site) => distanceMeters(state.waypoint, site.point) < 15)?.name || 'Selected map waypoint' : 'No intermediate stop';
  $('#waypointCoords').textContent = state.waypoint ? `${fmt.coord(state.waypoint.lat)}°N  ${fmt.coord(state.waypoint.lon)}°E` : 'Add a map point to compare a route through it';
  $('#pickStart').classList.toggle('active', state.pick === 'start');
  $('#pickDestination').classList.toggle('active', state.pick === 'destination');
  $('#pickWaypoint').classList.toggle('active', state.pick === 'waypoint');
  $('#pickHint').textContent = state.viewMode === 'terrain' ? 'Orbit the CTX elevation surface. Switch to 2D imagery to select a route point; calculated routes appear in both views.' : `Click the map to choose ${state.pick === 'start' ? 'a starting point' : state.pick === 'waypoint' ? 'an intermediate waypoint' : 'a destination'}. Routing requires the measured CTX terrain footprint; outside points remain selectable for exploration.`;
  const selected = state[state.pick];
  $('#latInput').value = selected?.lat.toFixed(5) ?? '';
  $('#lonInput').value = selected?.lon.toFixed(5) ?? '';
  updateOverview();
}

function setStatus(message, type = 'ready') {
  const box = $('#routeStatus');
  box.textContent = message;
  box.dataset.type = type;
}

function updateOverview() {
  const selected = state.routes[state.selectedRoute];
  const routeLine = selected?.points ? `${fmt.distance(selected.distanceMeters)} · ${fmt.minutes(selected.estimatedMinutes)} one-way` : 'Calculate routes for the current plan';
  const stops = [state.start, state.destination, ...(state.waypoint ? [state.waypoint] : [])];
  const allCovered = state.grid && stops.every((point) => { const index = cellAt(state.grid, point); return index !== null && Number.isFinite(state.grid.elevationsMeters[index]); });
  $('#missionOverview').innerHTML = `<strong>Jezero traverse study</strong><dl><div><dt>Start</dt><dd>${fmt.coord(state.start.lat)}°N, ${fmt.coord(state.start.lon)}°E</dd></div><div><dt>Destination</dt><dd>${fmt.coord(state.destination.lat)}°N, ${fmt.coord(state.destination.lon)}°E</dd></div><div><dt>Waypoint</dt><dd>${state.waypoint ? `${fmt.coord(state.waypoint.lat)}°N, ${fmt.coord(state.waypoint.lon)}°E` : 'None'}</dd></div><div><dt>Slope limit</dt><dd>${state.maxSlope.toFixed(1)}° per cell edge</dd></div><div><dt>Time budget</dt><dd>${fmt.minutes(state.timeBudgetMinutes)} one-way</dd></div><div><dt>Terrain data</dt><dd>${allCovered ? 'All stops covered' : 'Some stops outside coverage'}</dd></div></dl><p>${routeLine}</p><small>Scenario estimate — not a certified EVA assessment.</small>`;
}

function readScenarios() {
  try {
    const value = JSON.parse(localStorage.getItem(SCENARIO_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string') : [];
  } catch { return []; }
}

let savedScenarios = readScenarios();
function renderScenarios() {
  $('#savedScenarioList').innerHTML = savedScenarios.length ? savedScenarios.map((plan) => `<div class="saved-scenario"><span title="${escapeHtml(plan.name)}">${escapeHtml(plan.name)}</span><button data-load="${escapeHtml(plan.id)}" ${state.grid ? '' : 'disabled'} aria-label="Load ${escapeHtml(plan.name)}">Load</button><button data-remove="${escapeHtml(plan.id)}" aria-label="Remove ${escapeHtml(plan.name)}">×</button></div>`).join('') : 'No plans saved in this browser.';
  $('#savedScenarioList').querySelectorAll('[data-load]').forEach((button) => button.addEventListener('click', () => restoreScenario(button.dataset.load)));
  $('#savedScenarioList').querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => {
    savedScenarios = savedScenarios.filter((plan) => plan.id !== button.dataset.remove);
    try { localStorage.setItem(SCENARIO_KEY, JSON.stringify(savedScenarios)); renderScenarios(); setStatus('Saved plan removed from this browser.'); }
    catch { setStatus('Browser storage is unavailable.', 'error'); }
  }));
}

function saveScenario() {
  if (!state.grid) return;
  const name = $('#scenarioName').value.trim() || `Jezero plan ${savedScenarios.length + 1}`;
  if (savedScenarios.length >= 20) { setStatus('This browser has 20 saved plans. Remove one to save another.', 'error'); return; }
  const plan = { id: crypto.randomUUID(), name, savedAt: new Date().toISOString(),
    start: state.start, destination: state.destination, waypoint: state.waypoint,
    maxSlope: state.maxSlope, speed: state.speed, timeBudgetMinutes: state.timeBudgetMinutes,
    center: state.center, zoom: state.zoom, basemap: state.basemap, hirise: state.hirise, themis: state.themis,
    hiriseOpacity: state.hiriseOpacity, themisOpacity: state.themisOpacity };
  try { localStorage.setItem(SCENARIO_KEY, JSON.stringify([plan, ...savedScenarios])); savedScenarios.unshift(plan); renderScenarios(); $('#scenarioName').value = ''; setStatus(`Saved “${name}” in this browser.`); }
  catch { setStatus('Browser storage is unavailable; this plan was not saved.', 'error'); }
}

function restoreScenario(id) {
  const plan = savedScenarios.find((item) => item.id === id);
  const validPoint = (point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180;
  const sameStop = (a, b) => { const first = cellAt(state.grid, a), second = cellAt(state.grid, b); return first !== null && second !== null ? first === second : distanceMeters(a, b, state.grid.radiusMeters) < 10; };
  if (!plan || !validPoint(plan.start) || !validPoint(plan.destination) || (plan.waypoint && !validPoint(plan.waypoint)) ||
      sameStop(plan.start, plan.destination) ||
      (plan.waypoint && [plan.start, plan.destination].some((point) => sameStop(point, plan.waypoint))) ||
      !(plan.maxSlope >= .1 && plan.maxSlope <= 35) || !(plan.speed >= .2 && plan.speed <= 1.5) ||
      !(plan.timeBudgetMinutes >= 30 && plan.timeBudgetMinutes <= 480)) {
    setStatus('Saved plan is incompatible with the current terrain grid or controls.', 'error'); return;
  }
  state.start = plan.start; state.destination = plan.destination; state.waypoint = plan.waypoint || null;
  state.maxSlope = plan.maxSlope; state.speed = plan.speed; state.timeBudgetMinutes = plan.timeBudgetMinutes;
  state.center = validPoint(plan.center) ? plan.center : { lat: 18.458, lon: 77.430 };
  state.zoom = Number.isInteger(plan.zoom) && plan.zoom >= 7 && plan.zoom <= 16 ? plan.zoom : 11;
  state.basemap = ['ctx', 'mola'].includes(plan.basemap) ? plan.basemap : 'ctx';
  state.hirise = Boolean(plan.hirise); state.themis = Boolean(plan.themis);
  state.hiriseOpacity = Number.isFinite(plan.hiriseOpacity) ? Math.min(1, Math.max(0, plan.hiriseOpacity)) : .72;
  state.themisOpacity = Number.isFinite(plan.themisOpacity) ? Math.min(1, Math.max(0, plan.themisOpacity)) : .45;
  $('#slopeRange').value = state.maxSlope; $('#slopeValue').textContent = `${state.maxSlope.toFixed(1)}°`;
  $('#speedRange').value = state.speed; $('#speedValue').textContent = `${state.speed.toFixed(2)} m/s`;
  $('#budgetRange').value = state.timeBudgetMinutes; $('#budgetValue').textContent = fmt.minutes(state.timeBudgetMinutes);
  document.querySelector(`input[name="basemap"][value="${state.basemap}"]`).checked = true;
  $('#hiriseToggle').checked = state.hirise; $('#themisToggle').checked = state.themis;
  $('#hiriseOpacity').value = Math.round(state.hiriseOpacity * 100); $('#hiriseOpacityLabel').textContent = `${$('#hiriseOpacity').value}%`;
  $('#themisOpacity').value = Math.round(state.themisOpacity * 100); $('#themisOpacityLabel').textContent = `${$('#themisOpacity').value}%`;
  state.pick = 'destination'; updatePointLabels(); invalidateRoutes(); drawTiles(); calculate();
  renderSites();
  setStatus(`Restored “${plan.name}” and recalculating routes.`);
}

function renderSites() {
  const query = $('#siteSearch').value.trim().toLowerCase();
  const matches = SITES.filter((site) => `${site.name} ${site.type} ${site.mission}`.toLowerCase().includes(query));
  $('#siteList').innerHTML = matches.length ? matches.map((site) => {
    const sameStart = state.grid && cellAt(state.grid, site.point) === cellAt(state.grid, state.start);
    const sameDestination = state.grid && cellAt(state.grid, site.point) === cellAt(state.grid, state.destination);
    const sameWaypoint = state.grid && state.waypoint && cellAt(state.grid, site.point) === cellAt(state.grid, state.waypoint);
    return `<article class="site-card"><div class="site-type">${escapeHtml(site.type)} · ${escapeHtml(site.mission)}</div><h3>${escapeHtml(site.name)}</h3><div class="site-coords">${fmt.coord(site.point.lat)}°N · ${fmt.coord(site.point.lon)}°E</div><p>${escapeHtml(site.significance)}</p><small>${escapeHtml(site.note)}</small><div class="site-actions"><button data-site-view="${site.id}">View map</button><button data-site-destination="${site.id}" ${!state.grid || sameStart || sameWaypoint ? 'disabled' : ''}>Destination</button><button data-site-waypoint="${site.id}" ${!state.grid || sameStart || sameDestination || sameWaypoint ? 'disabled' : ''}>Add waypoint</button></div><a href="${site.source}" target="_blank" rel="noopener">NASA source ↗</a></article>`;
  }).join('') : '<p class="site-empty">No cited position matches this search.</p>';
  $('#siteList').querySelectorAll('[data-site-view]').forEach((button) => button.addEventListener('click', () => {
    const site = SITES.find((item) => item.id === button.dataset.siteView);
    state.center = { ...site.point }; state.zoom = 13; setViewMode('map'); drawTiles();
  }));
  $('#siteList').querySelectorAll('[data-site-destination]').forEach((button) => button.addEventListener('click', () => {
    const site = SITES.find((item) => item.id === button.dataset.siteDestination);
    setPoint('destination', site.point);
  }));
  $('#siteList').querySelectorAll('[data-site-waypoint]').forEach((button) => button.addEventListener('click', () => {
    const site = SITES.find((item) => item.id === button.dataset.siteWaypoint);
    setPoint('waypoint', site.point);
  }));
}

function routeCard(key, route) {
  const active = state.selectedRoute === key;
  const title = key === 'shortest' ? 'Shortest available' : key === 'waypoint' ? 'Via waypoint' : 'Terrain conservative';
  const description = key === 'shortest' ? 'Minimum horizontal distance under the slope limit' : key === 'waypoint' ? 'Visits the selected stop using shortest valid legs' : 'Penalizes steeper measured segments';
  if (route.error) return `<button class="route-card unavailable" disabled><span class="route-card-kicker">${title}</span><strong>No valid route</strong><small>${escapeHtml(route.error)}</small></button>`;
  const budget = route.estimatedMinutes <= state.timeBudgetMinutes ? 'Within budget' : 'Over budget';
  return `<button class="route-card ${active ? 'active' : ''} ${key}" data-route="${key}" aria-pressed="${active}"><span class="route-card-top"><span class="route-card-kicker">${title}</span><span class="route-arrow">↗</span></span><strong>${fmt.distance(route.distanceMeters)}</strong><small>${description}</small><span class="route-metrics"><span>↗ ${fmt.height(route.ascentMeters)} ascent</span><span>⌁ ${route.maxSlopeDeg.toFixed(1)}° max</span><span>◷ ${fmt.minutes(route.estimatedMinutes)}</span><span class="${budget === 'Over budget' ? 'over-budget' : 'within-budget'}">${budget}</span></span></button>`;
}

function updateResults() {
  const { shortest, conservative, waypoint } = state.routes;
  const entries = [['Shortest', shortest], ['Conservative', conservative], ...(state.waypoint ? [['Via waypoint', waypoint]] : [])];
  const valid = entries.map(([, route]) => route).filter((r) => r?.points);
  $('#routeCount').textContent = `${valid.length} ${valid.length === 1 ? 'route' : 'routes'}`;
  $('#routeCards').classList.toggle('has-waypoint', Boolean(state.waypoint));
  $('#routeCards').innerHTML = routeCard('shortest', shortest) + routeCard('conservative', conservative) + (state.waypoint ? routeCard('waypoint', waypoint) : '');
  $('#routeTableBody').innerHTML = entries.map(([name, route]) => route?.points ? `<tr><th scope="row">${name}</th><td>${fmt.distance(route.distanceMeters)}</td><td>${route.maxSlopeDeg.toFixed(1)}°</td><td>${fmt.height(route.ascentMeters)}</td></tr>` : `<tr><th scope="row">${name}</th><td colspan="3">No valid route</td></tr>`).join('');
  document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => { state.selectedRoute = button.dataset.route; updateResults(); drawOverlay(); updateInsight(); }));
  if (shortest?.points && conservative?.points) {
    const samePath = conservative.points.length === shortest.points.length && conservative.points.every((p, i) => p.lat === shortest.points[i].lat && p.lon === shortest.points[i].lon);
    const delta = conservative.distanceMeters - shortest.distanceMeters;
    const extra = delta < 1 ? `${delta.toFixed(2)} m` : fmt.distance(delta);
    const comparison = samePath ? 'Both direct profiles chose the same path at this slope setting.' : `Conservative path adds ${extra} and lowers maximum sampled slope from ${shortest.maxSlopeDeg.toFixed(1)}° to ${conservative.maxSlopeDeg.toFixed(1)}°.`;
    $('#comparisonNote').textContent = state.waypoint && waypoint?.points ? `${comparison} Waypoint route adds a required stop.` : comparison;
  } else $('#comparisonNote').textContent = 'Some profiles have no valid path under the current limit.';
  updateInsight();
  updateOverview();
  drawOverlay();
}

function profileSvg(route) {
  const values = route.points.map((p) => p.elevation);
  const minimum = Math.min(...values), maximum = Math.max(...values);
  const span = Math.max(1, maximum - minimum);
  let travelled = 0;
  const coords = route.points.map((p, i) => {
    if (i) travelled += distanceMeters(route.points[i - 1], p, state.grid.radiusMeters);
    return `${(12 + 268 * travelled / route.distanceMeters).toFixed(1)},${(86 - 66 * (p.elevation - minimum) / span).toFixed(1)}`;
  }).join(' ');
  return `<div class="profile"><div class="profile-header"><span>ELEVATION PROFILE · CTX DEM</span><span>${Math.round(minimum)} to ${Math.round(maximum)} m</span></div><svg viewBox="0 0 292 100" role="img" aria-label="Computed elevation profile from ${Math.round(minimum)} to ${Math.round(maximum)} meters over ${fmt.distance(route.distanceMeters)}"><line x1="12" x2="280" y1="87" y2="87" stroke="#607878" stroke-width="1"/><polyline points="${coords}" fill="none" stroke="#9be1ce" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="profile-footer"><span>START</span><span>${fmt.distance(route.distanceMeters)} · END</span></div></div>`;
}

function updateInsight() {
  const route = state.routes[state.selectedRoute];
  if (!route?.points) { $('#routeInsight').innerHTML = '<div class="empty-icon">⌁</div><strong>No selected route</strong><p>Adjust the slope limit or select points within the terrain grid.</p>'; return; }
  const total = route.distanceMeters;
  const source = state.grid;
  const routeName = state.selectedRoute === 'shortest' ? 'Shortest available' : state.selectedRoute === 'waypoint' ? 'Via waypoint' : 'Terrain conservative';
  const routeMethod = state.selectedRoute === 'conservative' ? 'This cost function gives a larger penalty to steeper steps.' : state.selectedRoute === 'waypoint' ? 'Each leg minimizes horizontal distance and visits the selected waypoint in order.' : 'This cost function minimizes horizontal distance.';
  const budgetText = route.estimatedMinutes <= state.timeBudgetMinutes ? `Within the ${fmt.minutes(state.timeBudgetMinutes)} one-way budget by ${fmt.minutes(state.timeBudgetMinutes - route.estimatedMinutes)}.` : `Exceeds the ${fmt.minutes(state.timeBudgetMinutes)} one-way budget by ${fmt.minutes(route.estimatedMinutes - state.timeBudgetMinutes)}.`;
  $('#routeInsight').innerHTML = `<div class="insight-head"><span class="insight-dot"></span><strong>${routeName}</strong></div><div class="insight-stats"><div><small>TRAVEL DISTANCE</small><strong>${fmt.distance(total)}</strong></div><div><small>MAX SEGMENT SLOPE</small><strong>${route.maxSlopeDeg.toFixed(1)}°</strong></div><div><small>ASCENT</small><strong>${fmt.height(route.ascentMeters)}</strong></div><div><small>TIME / ASSUMED</small><strong>${fmt.minutes(route.estimatedMinutes)}</strong></div></div>${profileSvg(route)}<p class="insight-copy">${budgetText} Computed from ${route.points.length} sampled cells in a ${source.resolutionMeters} m CTX elevation grid. ${routeMethod} The ${state.maxSlope}° limit is applied to every graph edge.</p><button id="inspectSteepest" class="outline-button">Inspect steepest segment ↗</button>`;
  $('#inspectSteepest').addEventListener('click', () => {
    const i = route.segments.reduce((best, s, index) => s.slopeDeg > route.segments[best].slopeDeg ? index : best, 0);
    const segment = route.segments[i];
    const p = route.points[i + 1];
    $('#routeInsight').insertAdjacentHTML('beforeend', `<div class="segment-detail"><strong>Steepest sampled edge</strong><p>${segment.slopeDeg.toFixed(2)}° from ${segment.elevationChange.toFixed(2)} m of height change across ${segment.length.toFixed(1)} m horizontally, near ${fmt.coord(p.lat)}°N, ${fmt.coord(p.lon)}°E. Derived from CTX DEM cells; finer hazards are unresolved.</p></div>`);
    state.center = { lat: p.lat, lon: p.lon }; state.zoom = Math.max(state.zoom, 13); setViewMode('map'); drawTiles();
  }, { once: true });
}

let calculationRevision = 0;
function calculate() {
  if (!state.grid) return;
  const revision = ++calculationRevision;
  setStatus('Searching measured terrain cells…', 'loading');
  $('#calculateBtn').disabled = true;
  setTimeout(() => {
    const common = { maxSlopeDeg: state.maxSlope, speedMetersPerSecond: state.speed };
    const shortest = planRoute(state.grid, state.start, state.destination, { ...common, terrainWeight: 0 });
    const conservative = planRoute(state.grid, state.start, state.destination, { ...common, terrainWeight: 8 });
    const waypoint = state.waypoint ? planRouteVia(state.grid, state.start, [state.waypoint], state.destination, { ...common, terrainWeight: 0 }) : null;
    if (revision !== calculationRevision) return;
    state.routes = { shortest, conservative, waypoint };
    state.selectedRoute = conservative.points ? 'conservative' : 'shortest';
    updateResults();
    $('#calculateBtn').disabled = false;
    const count = [shortest, conservative, waypoint].filter((r) => r?.points).length;
    setStatus(count ? `${count} route ${count === 1 ? 'profile' : 'profiles'} computed from CTX elevations.` : shortest.error, count ? 'ready' : 'error');
  }, 20);
}

function evidence(key) {
  state.activeEvidence = key;
  document.querySelectorAll('.source-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.evidence === key));
  const card = $('#evidenceCard');
  if (key === 'dem') {
    const sourceHash = state.grid?.sourceSha256 ? `${state.grid.sourceSha256.slice(0, 12)}…` : 'Recorded in terrain metadata';
    card.innerHTML = `<div class="evidence-card"><div class="evidence-type">OBSERVED NUMERICAL DATA</div><h3>CTX elevation mosaic</h3><p>USGS terrain model created from MRO Context Camera observations for Mars 2020 terrain relative navigation.</p><dl><div><dt>MISSION / INSTRUMENT</dt><dd>MRO · Context Camera</dd></div><div><dt>NATIVE GRID</dt><dd>20 m per cell</dd></div><div><dt>PRODUCT</dt><dd>JEZ_ctx_B_soc_008_DTM…</dd></div><div><dt>REFERENCE</dt><dd>East-positive, planetocentric; 3,396,190 m sphere</dd></div><div><dt>SOURCE SHA-256</dt><dd title="${state.grid?.sourceSha256 || ''}">${sourceHash}</dd></div><div><dt>PACKAGE CHECK</dt><dd>Verified before routing</dd></div></dl><div class="evidence-limit"><strong>What it supports</strong><p>Regional elevation differences and modelled slopes at cell scale. It cannot reveal every rock, soft soil patch or EVA hazard.</p></div><a href="${state.grid?.productPage || 'https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic'}" target="_blank" rel="noopener">View USGS source ↗</a></div>`;
  } else if (key === 'regional') {
    const regional = state.regionalGrid;
    card.innerHTML = `<div class="evidence-card"><div class="evidence-type">OBSERVED REGIONAL ELEVATION</div><h3>Jezero CTX science mosaic</h3><p>USGS/JPL mosaic derived from MRO Context Camera stereo images. The source spans about 89 × 101 km at 20 m pixel spacing.</p><dl><div><dt>MISSION / INSTRUMENT</dt><dd>MRO · Context Camera</dd></div><div><dt>SOURCE GRID</dt><dd>4,456 × 5,067 · 20 m</dd></div><div><dt>APP PACKAGE</dt><dd>80 m measured samples</dd></div><div><dt>VALID SAMPLES</dt><dd>${regional ? regional.validCells.toLocaleString() : 'Loading…'}</dd></div><div><dt>SOURCE SHA-256</dt><dd title="${regional?.sourceSha256 || ''}">${regional ? `${regional.sourceSha256.slice(0, 12)}…` : 'Recorded in metadata'}</dd></div><div><dt>PACKAGE CHECK</dt><dd>${regional ? 'Verified before rendering' : 'Loading…'}</dd></div></dl><div class="evidence-limit"><strong>What it supports</strong><p>Broader measured topographic context. The display mesh is coarser still; route calculations remain within the 20 m landing-area grid.</p></div><a href="${regional?.productPage || 'https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic'}" target="_blank" rel="noopener">View USGS source ↗</a></div>`;
  } else {
    const layer = MAP_LAYERS[key];
    card.innerHTML = `<div class="evidence-card"><div class="evidence-type">OBSERVED ORBITAL PRODUCT</div><h3>${escapeHtml(layer.title)}</h3><p>Displayed through NASA Mars Trek WMTS. This visual layer is separate from the numerical terrain grid used for routing.</p><dl><div><dt>MISSION</dt><dd>${escapeHtml(layer.mission)}</dd></div><div><dt>INSTRUMENT</dt><dd>${escapeHtml(layer.instrument)}</dd></div><div><dt>RESOLUTION</dt><dd>${escapeHtml(layer.resolution)}</dd></div></dl><div class="evidence-limit"><strong>Interpretation limit</strong><p>${escapeHtml(layer.limitation)}</p></div><a href="${layer.link}" target="_blank" rel="noopener">View NASA layer catalog ↗</a></div>`;
  }
}

function exportBrief() {
  const route = state.routes[state.selectedRoute];
  if (!route?.points) { setStatus('Calculate and select a valid route before exporting.', 'error'); return; }
  const waypointSite = state.waypoint && SITES.find((site) => distanceMeters(state.waypoint, site.point) < 15);
  const lines = [
    '# MARS//ATLAS — Mission research brief', '',
    `Generated: ${new Date().toISOString()}`,
    'Status: Independent research and educational prototype. Not a certified navigation or EVA tool.', '',
    '## Selected route',
    `Profile: ${state.selectedRoute === 'shortest' ? 'Shortest available' : state.selectedRoute === 'waypoint' ? 'Via waypoint' : 'Terrain conservative'}`,
    `Start: ${fmt.coord(state.start.lat)}°N, ${fmt.coord(state.start.lon)}°E`,
    ...(state.waypoint ? [`Waypoint: ${fmt.coord(state.waypoint.lat)}°N, ${fmt.coord(state.waypoint.lon)}°E (${waypointSite ? waypointSite.name : 'user-selected map point'})`] : []),
    `Destination: ${fmt.coord(state.destination.lat)}°N, ${fmt.coord(state.destination.lon)}°E`,
    `Horizontal distance: ${route.distanceMeters.toFixed(1)} m`,
    `Cumulative ascent: ${route.ascentMeters.toFixed(1)} m`,
    `Cumulative descent: ${route.descentMeters.toFixed(1)} m`,
    `Maximum sampled segment slope: ${route.maxSlopeDeg.toFixed(2)}°`,
    `Estimated one-way travel time: ${route.estimatedMinutes.toFixed(1)} min`, '',
    `Hypothetical one-way time budget: ${state.timeBudgetMinutes} min (${route.estimatedMinutes <= state.timeBudgetMinutes ? 'within' : 'over'} budget)`, '',
    '## Model assumptions',
    `Hard slope limit: ${state.maxSlope}° per graph edge`,
    `Walking speed: ${state.speed.toFixed(2)} m/s`,
    `Terrain penalty weight: ${route.model.terrainWeight}`,
    'Routing: A* search over valid DEM cells with eight-neighbor movement.', '',
    '## Source evidence',
    `Numerical DEM: ${state.grid.sourceId}`,
    `Mission/instrument: ${state.grid.mission} / ${state.grid.instrument}`,
    `Producer: ${state.grid.producer}`,
    `Resolution: ${state.grid.resolutionMeters} m per cell`,
    `Source: ${state.grid.sourceUrl}`,
    `USGS record: ${state.grid.productPage}`,
    `Source SHA-256: ${state.grid.sourceSha256}`,
    `Terrain package SHA-256 (verified in browser before routing): ${state.grid.elevationSha256}`,
    `Transport quantization: ${state.grid.valueStepMeters} m; measured maximum error: ${state.grid.maximumQuantizationErrorMeters} m`,
    `Processing: ${state.grid.processing}`,
    'Basemap and optional visual layers: NASA Mars Trek WMTS — https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars',
    `Hogwallow Flats Sol 464 location: ${HOGWALLOW_SOURCE}`, '',
    ...(waypointSite ? [`Selected waypoint source: ${waypointSite.source}`, ''] : []),
    '## Limits and unknowns',
    '- Orbital elevation is insufficient to certify pedestrian safety or small obstacle clearance.',
    '- Travel time is a simple distance/speed scenario estimate, not an EVA schedule.',
    '- The one-way time budget excludes stops, return travel, and EVA operations.',
    '- No live weather, suit performance, radiation, visibility, communications, or life support modelling is included.',
    '- Route endpoints selected by a user are model inputs, not verified scientific-site coordinates.',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'mars-atlas-mission-brief.md'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus('Mission brief exported with computed values and source references.');
}

function zoom(change) {
  if (state.viewMode === 'terrain') {
    state.terrainView.zoom = Math.min(1.8, Math.max(.62, state.terrainView.zoom * (change > 0 ? 1.13 : .88)));
    scheduleTerrainRender();
    return;
  }
  state.zoom = Math.min(16, Math.max(7, state.zoom + change)); drawTiles();
}

$('#landingBtn').addEventListener('click', () => setPoint('start', LANDING));
$('#roverBtn').addEventListener('click', () => setPoint('destination', HOGWALLOW_SOL464));
$('#pickStart').addEventListener('click', () => { state.pick = 'start'; updatePointLabels(); });
$('#pickDestination').addEventListener('click', () => { state.pick = 'destination'; updatePointLabels(); });
$('#pickWaypoint').addEventListener('click', () => { state.pick = 'waypoint'; updatePointLabels(); });
$('#clearWaypoint').addEventListener('click', () => { state.waypoint = null; state.pick = 'destination'; invalidateRoutes(); updatePointLabels(); renderSites(); drawOverlay(); setStatus('Waypoint cleared. Calculate to update routes.'); });
$('#applyCoords').addEventListener('click', () => setPoint(state.pick, { lat: Number($('#latInput').value), lon: Number($('#lonInput').value) }));
$('#slopeRange').addEventListener('input', (e) => { state.maxSlope = Number(e.target.value); $('#slopeValue').textContent = `${state.maxSlope.toFixed(1)}°`; });
$('#slopeRange').addEventListener('change', calculate);
$('#speedRange').addEventListener('input', (e) => { state.speed = Number(e.target.value); $('#speedValue').textContent = `${state.speed.toFixed(2)} m/s`; });
$('#speedRange').addEventListener('change', calculate);
$('#budgetRange').addEventListener('input', (e) => { state.timeBudgetMinutes = Number(e.target.value); $('#budgetValue').textContent = fmt.minutes(state.timeBudgetMinutes); if (state.routes.shortest) updateResults(); else updateOverview(); });
$('#calculateBtn').addEventListener('click', calculate);
$('#saveScenario').addEventListener('click', saveScenario);
$('#siteSearch').addEventListener('input', renderSites);
$('#exportBtn').addEventListener('click', exportBrief);
document.querySelectorAll('input[name="basemap"]').forEach((radio) => radio.addEventListener('change', (e) => { state.basemap = e.target.value; drawTiles(); }));
$('#hiriseToggle').addEventListener('change', (e) => { state.hirise = e.target.checked; drawTiles(); });
$('#themisToggle').addEventListener('change', (e) => { state.themis = e.target.checked; drawTiles(); });
$('#hiriseOpacity').addEventListener('input', (e) => { state.hiriseOpacity = Number(e.target.value) / 100; $('#hiriseOpacityLabel').textContent = `${e.target.value}%`; drawTiles(); });
$('#themisOpacity').addEventListener('input', (e) => { state.themisOpacity = Number(e.target.value) / 100; $('#themisOpacityLabel').textContent = `${e.target.value}%`; drawTiles(); });
document.querySelectorAll('[data-evidence]').forEach((button) => button.addEventListener('click', () => evidence(button.dataset.evidence)));
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setViewMode(button.dataset.view)));
document.querySelectorAll('[data-scope]').forEach((button) => button.addEventListener('click', () => setTerrainScope(button.dataset.scope)));
function setInspectorOpen(open) {
  $('.workspace').classList.toggle('inspector-open', open);
  $('#sourceInspector').toggleAttribute('inert', !open);
  $('#sourceInspector').setAttribute('aria-hidden', String(!open));
  $('#toggleInspector').setAttribute('aria-expanded', String(open));
  if (open) $('#closeInspector').focus();
  else $('#toggleInspector').focus();
}
$('#toggleInspector').addEventListener('click', () => setInspectorOpen(!$('.workspace').classList.contains('inspector-open')));
$('#closeInspector').addEventListener('click', () => setInspectorOpen(false));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('.workspace').classList.contains('inspector-open')) setInspectorOpen(false); });
$('#zoomIn').addEventListener('click', () => zoom(1));
$('#zoomOut').addEventListener('click', () => zoom(-1));
$('#resetMap').addEventListener('click', () => state.viewMode === 'terrain' ? resetTerrainView() : fitCoverage());
$('#fitRegion').addEventListener('click', fitRegion);
$('#focusRoute').addEventListener('click', () => state.viewMode === 'terrain' ? resetTerrainView() : focusRoute());
$('#resetTerrain').addEventListener('click', resetTerrainView);
$('#fullscreenMap').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement === map) await document.exitFullscreen();
    else await map.requestFullscreen();
    drawTiles();
  } catch (error) { setStatus(`Full screen unavailable: ${error.message}`, 'error'); }
});

const map = $('#map');
map.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
map.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button') || e.button !== 0) return;
  if (state.viewMode === 'terrain') {
    state.terrainPointer = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: state.terrainView.yaw, pitch: state.terrainView.pitch };
    map.classList.add('dragging-terrain');
    map.setPointerCapture(e.pointerId);
    return;
  }
  state.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, center: { ...state.center }, moved: false };
  map.setPointerCapture(e.pointerId);
});
map.addEventListener('pointermove', (e) => {
  if (state.viewMode === 'terrain') {
    $('#cursorCoords').textContent = '3D elevation / CTX DEM';
    if (!state.terrainPointer || state.terrainPointer.id !== e.pointerId) return;
    if (e.pointerType === 'mouse' && !(e.buttons & 1)) { state.terrainPointer = null; map.classList.remove('dragging-terrain'); return; }
    state.terrainView.yaw = state.terrainPointer.yaw + (e.clientX - state.terrainPointer.x) * .009;
    state.terrainView.pitch = Math.min(1.22, Math.max(.28, state.terrainPointer.pitch + (e.clientY - state.terrainPointer.y) * .007));
    scheduleTerrainRender();
    return;
  }
  const rect = map.getBoundingClientRect();
  const at = fromScreen(e.clientX - rect.left, e.clientY - rect.top);
  $('#cursorCoords').textContent = `${fmt.coord(at.lat)}°N / ${fmt.coord(at.lon)}°E`;
  if (!state.pointer || state.pointer.id !== e.pointerId) return;
  const dx = e.clientX - state.pointer.x, dy = e.clientY - state.pointer.y;
  if (Math.hypot(dx, dy) > 4) state.pointer.moved = true;
  if (!state.pointer.moved) return;
  const pixelsPerDegree = 256 * 2 ** state.zoom / 180;
  state.center = { lon: state.pointer.center.lon - dx / pixelsPerDegree, lat: state.pointer.center.lat + dy / pixelsPerDegree };
  drawTiles();
});
map.addEventListener('pointerup', (e) => {
  if (state.viewMode === 'terrain') {
    if (state.terrainPointer?.id === e.pointerId) { state.terrainPointer = null; map.classList.remove('dragging-terrain'); }
    return;
  }
  if (!state.pointer || state.pointer.id !== e.pointerId) return;
  if (!state.pointer.moved) { const rect = map.getBoundingClientRect(); setPoint(state.pick, fromScreen(e.clientX - rect.left, e.clientY - rect.top)); }
  state.pointer = null;
});
map.addEventListener('pointercancel', (e) => {
  if (state.terrainPointer?.id === e.pointerId) { state.terrainPointer = null; map.classList.remove('dragging-terrain'); }
  if (state.pointer?.id === e.pointerId) state.pointer = null;
});
map.addEventListener('lostpointercapture', (e) => {
  if (state.terrainPointer?.id === e.pointerId) { state.terrainPointer = null; map.classList.remove('dragging-terrain'); }
  if (state.pointer?.id === e.pointerId) state.pointer = null;
});
map.addEventListener('keydown', (e) => {
  if (state.viewMode === 'terrain') {
    if (e.key === 'ArrowLeft') state.terrainView.yaw -= .08;
    else if (e.key === 'ArrowRight') state.terrainView.yaw += .08;
    else if (e.key === 'ArrowUp') state.terrainView.pitch = Math.max(.28, state.terrainView.pitch - .06);
    else if (e.key === 'ArrowDown') state.terrainView.pitch = Math.min(1.22, state.terrainView.pitch + .06);
    else if (e.key === '+' || e.key === '=') zoom(1);
    else if (e.key === '-') zoom(-1);
    else return;
    e.preventDefault(); scheduleTerrainRender(); return;
  }
  const step = 80 / (256 * 2 ** state.zoom / 180);
  if (e.key === 'ArrowLeft') state.center.lon -= step;
  else if (e.key === 'ArrowRight') state.center.lon += step;
  else if (e.key === 'ArrowUp') state.center.lat += step;
  else if (e.key === 'ArrowDown') state.center.lat -= step;
  else if (e.key === '+' || e.key === '=') zoom(1);
  else if (e.key === '-') zoom(-1);
  else return;
  e.preventDefault(); drawTiles();
});
new ResizeObserver(drawTiles).observe(map);

updatePointLabels();
renderScenarios();
renderSites();
evidence('dem');
drawTiles();
fetch(new URL('../public/data/jezero-grid-meta.json', import.meta.url)).then((response) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(async (metadata) => {
  const response = await fetch(new URL(`../public/data/${metadata.elevationFile}`, import.meta.url));
  if (!response.ok) throw new Error(`Elevation file HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== metadata.elevationSha256) throw new Error('Elevation file checksum does not match its source metadata');
  return decodeTerrain(metadata, buffer);
}).then((grid) => {
  if (grid.elevationsMeters.length !== grid.width * grid.height) throw new Error('Terrain grid has inconsistent dimensions');
  state.grid = grid;
  state.terrainMesh = buildTerrainMesh(grid);
  setTerrainScope('local');
  document.querySelector('[data-view="terrain"]').disabled = false;
  const widthKm = grid.width * grid.resolutionMeters / 1000;
  const heightKm = grid.height * grid.resolutionMeters / 1000;
  updateCoverageInfo();
  $('#coverageKeyText').textContent = `CTX DEM · ${Math.round(widthKm)} × ${Math.round(heightKm)} KM`;
  renderScenarios();
  renderSites();
  evidence('dem');
  setStatus(`CTX terrain ready · ${(grid.width * grid.height).toLocaleString()} measured cells at 20 m.`);
  fitCoverage();
  calculate();
  setViewMode('terrain');
}).catch((error) => {
  setStatus(`Numerical terrain unavailable: ${error.message}. Routing is disabled.`, 'error');
  $('#calculateBtn').disabled = true;
});

fetch(new URL('../public/data/jezero-regional-meta.json', import.meta.url)).then((response) => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(async (metadata) => {
  const response = await fetch(new URL(`../public/data/${metadata.elevationFile}`, import.meta.url));
  if (!response.ok) throw new Error(`Regional elevation file HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== metadata.elevationSha256) throw new Error('Regional elevation checksum mismatch');
  return decodeTerrain(metadata, buffer);
}).then((grid) => {
  state.regionalGrid = grid;
  state.regionalMesh = buildTerrainMesh(grid);
  document.querySelector('[data-scope="regional"]').disabled = false;
  $('#fitRegion').disabled = false;
  updateCoverageInfo();
  if (state.activeEvidence === 'regional') evidence('regional');
}).catch((error) => { console.warn(`Regional terrain unavailable: ${error.message}`); });
