/**
 * iterm2-encoder.js — iTerm2 Protocol Encoder (Node.js)
 *
 * Encodes RGBA pixel data to iTerm2 inline image protocol.
 * Protocol: ESC ] 1337 ; File=size=N;width=Wpx;height=Hpx;inline=1:<base64> BEL
 */

'use strict';

const sharp = require('sharp');
const { Scaler } = require('./scaler');

/**
 * Encode framebuffer to iTerm2 escape sequence
 * @param {Framebuffer} framebuffer - Source framebuffer
 * @param {Object} options - Options
 * @param {number} options.maxWidth - Max width in pixels
 * @param {number} options.maxHeight - Max height in pixels
 * @param {Object} options.backgroundColor - Background color {r, g, b}
 * @param {boolean} options.noResize - Keep original resolution
 * @returns {Promise<{sequence: string, width: number, height: number, size: number}>}
 */
async function encodeITerm2(framebuffer, options = {}) {
  const fb = framebuffer.clone();

  // Alpha compose with background
  const bgColor = options.backgroundColor || { r: 0, g: 0, b: 0 };
  fb.alphaComposeBackground(bgColor);

  let width, height;

  if (options.noResize) {
    width = fb.width;
    height = fb.height;
  } else {
    const maxWidth = options.maxWidth || 800;
    const maxHeight = options.maxHeight || 600;
    const target = Scaler.calculateScaleToFit(fb.width, fb.height, maxWidth, maxHeight, { cellX: 1, cellY: 1 });
    width = target.width;
    height = target.height;
  }

  // Resize if needed
  let rawData = Buffer.from(fb.getRawData());
  if (!options.noResize && (width !== fb.width || height !== fb.height)) {
    rawData = await sharp(rawData, { raw: { width: fb.width, height: fb.height, channels: 4 } })
      .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
      .raw()
      .toBuffer();
  }

  // Encode to PNG
  const pngData = await sharp(rawData, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 1 })
    .toBuffer();

  // Generate escape sequence
  const base64 = pngData.toString('base64');
  const sequence = `\x1b]1337;File=size=${pngData.length};width=${width}px;height=${height}px;inline=1:${base64}\x07`;

  return {
    sequence,
    width,
    height,
    size: pngData.length,
    base64Length: base64.length
  };
}

/**
 * Check if terminal supports iTerm2 protocol
 */
function isITerm2Supported() {
  const termProgram = process.env.TERM_PROGRAM || '';
  const supported = ['iTerm', 'WezTerm', 'mintty', 'rio', 'WarpTerminal', 'vscode'];
  return supported.some(t => termProgram.includes(t));
}

module.exports = { encodeITerm2, isITerm2Supported };
