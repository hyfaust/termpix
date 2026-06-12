/**
 * dither.js — Dithering Algorithms
 *
 * Floyd-Steinberg error diffusion and Bayer ordered dithering.
 * Ported from sixel-web project.
 */

'use strict';

/**
 * Apply Bayer ordered dithering (before quantization)
 * @param {Uint8Array} rgba - RGBA pixel data
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {number} amplitude - Dither amplitude
 * @returns {Uint8Array} Modified RGBA data
 */
function applyBayerDither(rgba, w, h, amplitude) {
  // 8x8 Bayer matrix
  const BAYER = [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ];

  const result = new Uint8Array(rgba.length);
  result.set(rgba);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const threshold = (BAYER[y & 7][x & 7] - 32) * amplitude / 32;
      result[idx]     = Math.max(0, Math.min(255, rgba[idx] + threshold));
      result[idx + 1] = Math.max(0, Math.min(255, rgba[idx + 1] + threshold));
      result[idx + 2] = Math.max(0, Math.min(255, rgba[idx + 2] + threshold));
    }
  }

  return result;
}

/**
 * Apply Floyd-Steinberg error diffusion (after quantization)
 * @param {Uint8Array} rgba - Original RGBA pixel data
 * @param {Uint8Array} pixels - Quantized palette indices
 * @param {Uint8Array} palette - RGB palette (3 bytes per color)
 * @param {number} w - Width
 * @param {number} h - Height
 * @returns {Uint8Array} Dithered palette indices
 */
function applyFloydSteinberg(rgba, pixels, palette, w, h) {
  const result = new Uint8Array(pixels.length);
  result.set(pixels);

  // Working buffer with float error
  const errR = new Float32Array(w * h);
  const errG = new Float32Array(w * h);
  const errB = new Float32Array(w * h);

  // Initialize with original colors
  for (let i = 0; i < w * h; i++) {
    errR[i] = rgba[i * 4];
    errG[i] = rgba[i * 4 + 1];
    errB[i] = rgba[i * 4 + 2];
  }

  // 15-bit color lookup cache
  const colorCache = new Uint16Array(32768);

  function findNearestColor(r, g, b) {
    const hash = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let cached = colorCache[hash];
    if (cached > 0) return cached - 1;

    let bestIdx = 0, bestDist = 0x7FFFFFFF;
    for (let i = 0; i < palette.length / 3; i++) {
      const dr = r - palette[i * 3];
      const dg = g - palette[i * 3 + 1];
      const db = b - palette[i * 3 + 2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    }

    colorCache[hash] = bestIdx + 1;
    return bestIdx;
  }

  // Scan direction alternates per row
  for (let y = 0; y < h; y++) {
    const forward = (y % 2 === 0);
    const startX = forward ? 0 : w - 1;
    const endX = forward ? w : -1;
    const dx = forward ? 1 : -1;

    for (let x = startX; x !== endX; x += dx) {
      const idx = y * w + x;
      let r = Math.max(0, Math.min(255, Math.round(errR[idx])));
      let g = Math.max(0, Math.min(255, Math.round(errG[idx])));
      let b = Math.max(0, Math.min(255, Math.round(errB[idx])));

      const nearest = findNearestColor(r, g, b);
      result[idx] = nearest;

      const quantErrR = r - palette[nearest * 3];
      const quantErrG = g - palette[nearest * 3 + 1];
      const quantErrB = b - palette[nearest * 3 + 2];

      // Distribute error (Floyd-Steinberg weights)
      // Right: 7/16, Left-down: 3/16, Down: 5/16, Right-down: 1/16
      if (x + dx >= 0 && x + dx < w) {
        const ri = y * w + (x + dx);
        errR[ri] += quantErrR * 7 / 16;
        errG[ri] += quantErrG * 7 / 16;
        errB[ri] += quantErrB * 7 / 16;
      }
      if (y + 1 < h) {
        if (x - dx >= 0 && x - dx < w) {
          const li = (y + 1) * w + (x - dx);
          errR[li] += quantErrR * 3 / 16;
          errG[li] += quantErrG * 3 / 16;
          errB[li] += quantErrB * 3 / 16;
        }
        const di = (y + 1) * w + x;
        errR[di] += quantErrR * 5 / 16;
        errG[di] += quantErrG * 5 / 16;
        errB[di] += quantErrB * 5 / 16;
        if (x + dx >= 0 && x + dx < w) {
          const ri2 = (y + 1) * w + (x + dx);
          errR[ri2] += quantErrR * 1 / 16;
          errG[ri2] += quantErrG * 1 / 16;
          errB[ri2] += quantErrB * 1 / 16;
        }
      }
    }
  }

  return result;
}

module.exports = {
  applyBayerDither: applyBayerDither,
  applyFloydSteinberg: applyFloydSteinberg
};
