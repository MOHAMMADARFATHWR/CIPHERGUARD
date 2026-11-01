/**
 * CipherGuard 3D - SimpleMaps World SVG & Robinson Projection Utilities
 * Documentation & Geometry: https://simplemaps.com/resources/svg-world
 * Coordinate space: 2000 x 857 (Robinson Projection)
 */

export interface WorldCountryPath {
  id?: string;
  name?: string;
  className?: string;
  d: string;
}

// Robinson projection empirical interpolation lookup tables (5-degree increments from 0° to 90°)
// Derived from standard USGS / SimpleMaps cartographic specification
const ROBINSON_AA = [
  0.84870000, 0.84751182, 0.84479598, 0.84021300, 0.83359314,
  0.82578510, 0.81475200, 0.80006949, 0.78216192, 0.76060494,
  0.73658673, 0.70866450, 0.67777182, 0.64475739, 0.60987582,
  0.57134484, 0.52729731, 0.48562614, 0.45167814,
];

const ROBINSON_BB = [
  0.00000000, 0.08384260, 0.16768520, 0.25152780, 0.33537040,
  0.41921300, 0.50305560, 0.58689820, 0.67047034, 0.75336633,
  0.83518048, 0.91537187, 0.99339958, 1.06872269, 1.14066505,
  1.20841528, 1.27035062, 1.31998003, 1.35230000,
];

export const MAP_DIMENSIONS = {
  width: 2000,
  height: 857,
};

/**
 * Projects latitude (-90 to 90) and longitude (-180 to 180) to Cartesian (x, y)
 * in the SimpleMaps Robinson 2000x857 coordinate space.
 */
export function projectRobinson(
  lat: number,
  lng: number,
  width = MAP_DIMENSIONS.width,
  height = MAP_DIMENSIONS.height
): { x: number; y: number } {
  const isSouth = lat < 0;
  const clampedLat = Math.min(Math.abs(lat), 90);
  const stepFloor = Math.floor(clampedLat / 5);
  const stepCeil = Math.min(Math.ceil(clampedLat / 5), 18);
  const interpolation = (clampedLat - stepFloor * 5) / 5;

  const aa = ROBINSON_AA[stepFloor] + (ROBINSON_AA[stepCeil] - ROBINSON_AA[stepFloor]) * interpolation;
  const bb = ROBINSON_BB[stepFloor] + (ROBINSON_BB[stepCeil] - ROBINSON_BB[stepFloor]) * interpolation;

  // SimpleMaps standard calibration against world.svg viewBox="0 0 2000 857"
  const scale = width / (2 * Math.PI * 0.8487);
  const x = width / 2 + (lng * Math.PI / 180) * aa * scale;
  const y = height / 2 - bb * (isSouth ? -1 : 1) * (height / (2 * 1.3523));

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}

/**
 * Fast regex parser to extract paths and metadata from SimpleMaps world.svg
 */
export function parseWorldSvg(svgText: string): WorldCountryPath[] {
  const paths: WorldCountryPath[] = [];
  const regex = /<path([^>]+)\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(svgText)) !== null) {
    const attrs = match[1];
    const idMatch = attrs.match(/id="([^"]+)"/);
    const nameMatch = attrs.match(/name="([^"]+)"/);
    const classMatch = attrs.match(/class="([^"]+)"/);
    const dMatch = attrs.match(/d="([^"]+)"/);

    if (dMatch) {
      paths.push({
        id: idMatch ? idMatch[1] : undefined,
        name: nameMatch ? nameMatch[1] : undefined,
        className: classMatch ? classMatch[1] : undefined,
        d: dMatch[1],
      });
    }
  }

  return paths;
}

// In-memory cache for loaded SVG path list
let cachedPaths: WorldCountryPath[] | null = null;
let fetchPromise: Promise<WorldCountryPath[]> | null = null;

/**
 * Loads the SimpleMaps world.svg file from public asset path,
 * parses country paths, and caches the result.
 */
export async function fetchWorldSvgPaths(
  assetUrl = '/assets/aistudio/world_d364c888.svg'
): Promise<WorldCountryPath[]> {
  if (cachedPaths) {
    return cachedPaths;
  }

  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch(assetUrl);
      if (!response.ok) {
        throw new Error(`Failed to load world.svg: ${response.statusText}`);
      }
      const svgText = await response.text();
      const parsed = parseWorldSvg(svgText);
      cachedPaths = parsed;
      return parsed;
    } catch (err) {
      console.warn('Could not load SimpleMaps SVG from network/assets, using geometry fallback:', err);
      return [];
    }
  })();

  return fetchPromise;
}

/**
 * Mapping of common country codes to country names & ISO identifiers
 */
export const COUNTRY_ISO_MAP: Record<string, { code: string; name: string }> = {
  'United States': { code: 'US', name: 'United States' },
  'Russian Federation': { code: 'RU', name: 'Russia' },
  'China': { code: 'CN', name: 'China' },
  'United Kingdom': { code: 'GB', name: 'United Kingdom' },
  'Germany': { code: 'DE', name: 'Germany' },
  'Romania': { code: 'RO', name: 'Romania' },
  'India': { code: 'IN', name: 'India' },
  'Brazil': { code: 'BR', name: 'Brazil' },
  'Japan': { code: 'JP', name: 'Japan' },
  'Australia': { code: 'AU', name: 'Australia' },
  'Canada': { code: 'CA', name: 'Canada' },
  'France': { code: 'FR', name: 'France' },
  'Italy': { code: 'IT', name: 'Italy' },
  'Ukraine': { code: 'UA', name: 'Ukraine' },
  'Netherlands': { code: 'NL', name: 'Netherlands' },
  'Singapore': { code: 'SG', name: 'Singapore' },
  'United Arab Emirates': { code: 'AE', name: 'United Arab Emirates' },
  'South Africa': { code: 'ZA', name: 'South Africa' },
  'South Korea': { code: 'KR', name: 'South Korea' },
};

/**
 * Resolves country code and display name from an SVG country path object
 */
export function getCountryInfo(path: WorldCountryPath): { code: string; name: string } {
  if (path.id) {
    return {
      code: path.id.toUpperCase(),
      name: path.name || path.id,
    };
  }

  if (path.className) {
    const mapped = COUNTRY_ISO_MAP[path.className];
    if (mapped) return mapped;
    return {
      code: path.className.slice(0, 2).toUpperCase(),
      name: path.className,
    };
  }

  return { code: 'XX', name: 'Unknown' };
}
