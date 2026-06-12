/**
 * sixel-encoder.js — Sixel Protocol Encoder
 *
 * Ported from sixel-web project (originally from pysixel.py).
 */

'use strict';

const SIXEL_WEIGHTS = new Uint8Array([1, 2, 4, 8, 16, 32]);

/**
 * Encode palette-indexed pixel array to Sixel bytes
 * @param {Uint8Array} pixels - Palette index for each pixel
 * @param {Uint8Array} palette - RGB palette (3 bytes per color)
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {Object} opts - Options
 * @param {boolean} opts.eightBit - Use 8-bit DCS
 * @param {boolean} opts.griLimit - VT240 compatible RLE limit
 * @param {string} opts.encodePolicy - RLE policy: 'auto', 'fast', 'size'
 * @returns {Uint8Array} Sixel byte stream
 */
function encodeSixel(pixels, palette, w, h, opts) {
  opts = opts || {};
  const eightBit = opts.eightBit || false;
  const griLimit = opts.griLimit || false;
  const encodePolicy = opts.encodePolicy || 'auto';

  // Collect used colors
  const usedColorSet = new Set();
  for (let i = 0; i < pixels.length; i++) usedColorSet.add(pixels[i]);
  const usedColors = Array.from(usedColorSet).sort((a, b) => a - b);

  const parts = [];
  let totalLen = 0;

  function push(bytes) {
    parts.push(bytes);
    totalLen += bytes.length;
  }

  function strToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i) & 0xFF);
    }
    return new Uint8Array(bytes);
  }

  // DCS header + raster attributes (width/height)
  push(strToBytes(eightBit ? '\x900;0;0q' : '\x1bP0;0;0q'));
  push(strToBytes('"1;1;' + w + ';' + h));

  // Color definitions
  for (let k = 0; k < usedColors.length; k++) {
    const idx = usedColors[k];
    const r = palette[idx * 3];
    const g = palette[idx * 3 + 1];
    const b = palette[idx * 3 + 2];
    push(strToBytes(
      '#' + idx + ';2;' + ((r * 100 / 255) | 0) + ';' + ((g * 100 / 255) | 0) + ';' + ((b * 100 / 255) | 0)
    ));
  }

  // Encode band by band (6 rows per band)
  for (let sy = 0; sy < h; sy += 6) {
    const bandH = Math.min(6, h - sy);

    // Collect colors in this band
    const bandColorSet = new Set();
    for (let y = 0; y < bandH; y++) {
      for (let x = 0; x < w; x++) {
        bandColorSet.add(pixels[(sy + y) * w + x]);
      }
    }
    const bandColors = Array.from(bandColorSet).sort((a, b) => a - b);

    for (let ci = 0; ci < bandColors.length; ci++) {
      const cidx = bandColors[ci];

      // Color marker
      push(strToBytes('#' + cidx));

      // Calculate sixel value for each column
      const sixelVals = new Uint8Array(w);
      for (let x = 0; x < w; x++) {
        let bits = 0;
        for (let bit = 0; bit < bandH; bit++) {
          if (pixels[(sy + bit) * w + x] === cidx) {
            bits |= SIXEL_WEIGHTS[bit];
          }
        }
        sixelVals[x] = 0x3F + bits;
      }

      // RLE encode
      push(rleEncode(sixelVals, griLimit, encodePolicy));

      // '$' carriage return to start of line
      push(new Uint8Array([0x24]));
    }

    // Last '$' becomes '-' (newline to next band)
    const last = parts[parts.length - 1];
    if (last.length === 1 && last[0] === 0x24) {
      parts[parts.length - 1] = new Uint8Array([0x2D]);
    } else {
      push(new Uint8Array([0x2D]));
    }
  }

  // DCS terminator
  push(strToBytes(eightBit ? '\x9c' : '\x1b\\'));

  // Merge all parts
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (let i = 0; i < parts.length; i++) {
    result.set(parts[i], offset);
    offset += parts[i].length;
  }
  return result;
}

/**
 * RLE encode sixel values
 */
function rleEncode(vals, griLimit, encodePolicy) {
  const n = vals.length;
  if (n === 0) return new Uint8Array(0);
  if (encodePolicy === 'fast') return vals.slice();

  const threshold = encodePolicy === 'size' ? 2 : 4;
  const out = [];

  let i = 0;
  while (i < n) {
    const v = vals[i];
    let j = i + 1;
    while (j < n && vals[j] === v) j++;
    const run = j - i;

    if (run >= threshold) {
      if (griLimit) {
        let rem = run;
        while (rem > 0) {
          const chunk = Math.min(rem, 255);
          out.push(0x21);
          const s = String(chunk);
          for (let k = 0; k < s.length; k++) out.push(s.charCodeAt(k));
          out.push(v);
          rem -= chunk;
        }
      } else {
        out.push(0x21);
        const s = String(run);
        for (let k = 0; k < s.length; k++) out.push(s.charCodeAt(k));
        out.push(v);
      }
    } else {
      for (let k = i; k < j; k++) out.push(vals[k]);
    }
    i = j;
  }
  return new Uint8Array(out);
}

module.exports = { encodeSixel };
