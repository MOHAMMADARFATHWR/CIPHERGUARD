/**
 * CipherGuard 3D - SimpleMaps World Map Geometry & Projection Unit Tests
 * Tests Robinson projection conversions, boundary coordinates,
 * and SVG path metadata extraction for the Threat Heatmap.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectRobinson,
  parseWorldSvg,
  getCountryInfo,
  MAP_DIMENSIONS,
} from '../../src/utils/worldMapUtils';

describe('SimpleMaps Robinson Map Projection', () => {
  it('should map Prime Meridian / Equator intersection near center', () => {
    const pt = projectRobinson(0, 0);
    assert.equal(pt.x, 1000);
    assert.equal(pt.y, 428.5);
  });

  it('should accurately project Mumbai Bank Core coordinates', () => {
    // Mumbai: lat 19.076, lng 72.877
    const pt = projectRobinson(19.076, 72.877);
    // Should fall within India's SimpleMaps bounding box (~1390-1410 x, ~320-335 y)
    assert.ok(pt.x >= 1380 && pt.x <= 1420, `Expected Mumbai x in range, got ${pt.x}`);
    assert.ok(pt.y >= 310 && pt.y <= 340, `Expected Mumbai y in range, got ${pt.y}`);
  });

  it('should accurately project Bucharest (MITM origin node)', () => {
    // Bucharest: lat 44.4268, lng 26.1025
    const pt = projectRobinson(44.4268, 26.1025);
    // Should fall near Romania in SimpleMaps (~1120-1140 x, ~185-200 y)
    assert.ok(pt.x >= 1115 && pt.x <= 1145, `Expected Bucharest x in range, got ${pt.x}`);
    assert.ok(pt.y >= 180 && pt.y <= 205, `Expected Bucharest y in range, got ${pt.y}`);
  });

  it('should accurately project Ashburn, USA (Signature forgery node)', () => {
    // Ashburn: lat 39.0438, lng -77.4874
    const pt = projectRobinson(39.0438, -77.4874);
    // Should fall in US East Coast (~600-620 x, ~210-230 y)
    assert.ok(pt.x >= 590 && pt.x <= 630, `Expected Ashburn x in range, got ${pt.x}`);
    assert.ok(pt.y >= 205 && pt.y <= 235, `Expected Ashburn y in range, got ${pt.y}`);
  });

  it('should clamp extreme latitudes and avoid NaN coordinates', () => {
    const northPole = projectRobinson(95, 0);
    assert.ok(!Number.isNaN(northPole.x) && !Number.isNaN(northPole.y));

    const southPole = projectRobinson(-95, 0);
    assert.ok(!Number.isNaN(southPole.x) && !Number.isNaN(southPole.y));
    assert.ok(southPole.y > northPole.y, 'South pole y should be greater than north pole y');
  });
});

describe('SimpleMaps World SVG Path Extraction', () => {
  it('should parse country paths with IDs and names correctly', () => {
    const sampleSvg = `
      <svg viewBox="0 0 2000 857">
        <path id="IN" name="India" d="M1427.6 308l-2.8 3z" />
        <path id="RO" name="Romania" d="M1118.9 193.1l1.6 0.7z" />
        <path class="United States" d="M 539.5 194.5 533.4 196.5 Z" />
      </svg>
    `;

    const paths = parseWorldSvg(sampleSvg);
    assert.equal(paths.length, 3);

    const india = paths[0];
    assert.equal(india.id, 'IN');
    assert.equal(india.name, 'India');
    const indiaInfo = getCountryInfo(india);
    assert.equal(indiaInfo.code, 'IN');
    assert.equal(indiaInfo.name, 'India');

    const usa = paths[2];
    assert.equal(usa.className, 'United States');
    const usaInfo = getCountryInfo(usa);
    assert.equal(usaInfo.code, 'US');
    assert.equal(usaInfo.name, 'United States');
  });
});
