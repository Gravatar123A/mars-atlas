import { readFileSync, writeFileSync } from 'node:fs';

const { nasa, other } = JSON.parse(readFileSync('resources/catalog.json', 'utf8'));
const rows = (items) => items.map(([name, url]) => `| ${name} | ${url} |`).join('\n');
const text = `# Mars Atlas — copy-ready project fields

Prepared 15 November 2026. This is a draft for a future submission; check the applicable year's form and challenge rules before entering it. Every link below is a full public URL. NASA mission observations and USGS processed products are separated by producing resource.

## Project Details

Mars Atlas is an independent interactive Mars research workspace for studying orbital imagery, measured elevation, and exploratory surface routes. Users can examine Jezero, Gale, and Gusev craters, switch image layers, inspect published mission locations, measure direct distances, and compare model routes where numerical elevation grids are packaged. Jezero supports a 20 m landing-area terrain grid and an 80 m sampled regional grid; Gale supports a 20 m sampled landing window from a USGS merged DEM. Gusev provides imagery and a documented Spirit landing position but does not offer elevation routing without a verified numeric DEM.

For Jezero and Gale, users choose a start, destination, and optional waypoint, then set a maximum sampled slope, assumed speed, and one-way time budget. The site computes route alternatives and reports distance, ascent, maximum sampled slope, an elevation profile, and north-referenced checkpoint headings and turns. A 3D view renders measured terrain as a sampled mesh. The evidence panel stays open and links each layer or terrain product to its source. Exported briefs include the active settings, computed results, source identifiers, and limitations.

The benefit is a transparent way to explore how terrain data and assumptions affect a route study. It can support public learning and early research discussion; it is not an operational rover or astronaut navigation tool. We used HTML, CSS, JavaScript, a Web Worker, Python, NumPy, Rasterio, Node.js, NASA Mars Trek imagery, USGS terrain mosaics derived from NASA observations, an upstream ESA Mars Express HRSC contribution to Gale, Lucide icons, GitHub, and Vercel. No special hardware was required. The creative feature is the combination of interactive 2D/3D terrain comparison, explicit no-data boundaries, checkpoint bearings, and product-level evidence in one interface. We considered source provenance, resolution, missing cells, mixed sensor inputs, visual versus numerical data, route model assumptions, and the risk of implying field safety.

Project: https://marsatlas-map.vercel.app/  
Workspace: https://marsatlas-map.vercel.app/app/  
Annotated demo and PowerPoint: https://marsatlas-map.vercel.app/guide/  
Source register: https://marsatlas-map.vercel.app/resources/  
Code: https://github.com/gravatar123a/mars-atlas

## Use of Super Intelligence (SI)

Select the options corresponding to **code and data** and **written text/content**, if offered by the form. OpenAI Codex assisted in writing and reviewing application code, interface copy, documentation, source-register descriptions, and the PowerPoint guide. Human direction and review determined project scope, checked source provenance, and tested the running app. The scientific source rasters and live imagery are externally published; local terrain packages and route values are deterministic software derivatives, not SI fabricated observations. No SI-generated image, video, or audio is included. Screenshots in the guide are captures of the running app with editable circle annotations. The public source page, package metadata, and this statement disclose SI use. No NASA logo, flag, or mission insignia is used in generated content.

## NASA Data — enter one link per row

| Link Text | Link URL |
| --- | --- |
${rows(nasa)}

## Space Agency Partner & Other Data — enter one link per row

| Link Text | Link URL |
| --- | --- |
${rows(other)}

The source register also explains how each item was used: https://marsatlas-map.vercel.app/resources/ . Scientific metric definitions and processing limits are documented in the repository's DATA_SOURCES.md and SCIENTIFIC_METHOD.md.
`;
writeFileSync('SUBMISSION_FIELDS.md', text);
console.log(`Wrote ${nasa.length} NASA and ${other.length} other link rows`);
