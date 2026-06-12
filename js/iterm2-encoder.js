/**
 * iterm2-encoder.js — iTerm2 Protocol Encoder (Browser)
 *
 * Encodes RGBA pixel data to iTerm2 inline image protocol.
 * Protocol: ESC ] 1337 ; File=size=N;width=Wpx;height=Hpx;inline=1:<base64> BEL
 */

(function () {
  'use strict';

  /**
   * Encode framebuffer to iTerm2 escape sequence
   * @param {Framebuffer} framebuffer - Source framebuffer
   * @param {Object} options - Options
   * @returns {Promise<{sequence: string, width: number, height: number, size: number}>}
   */
  async function encodeITerm2(framebuffer, options) {
    options = options || {};
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

    // Use Canvas for resizing and PNG encoding
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw from source framebuffer to canvas
    const srcCanvas = fb.toCanvas();
    ctx.drawImage(srcCanvas, 0, 0, width, height);

    // Get PNG blob
    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const pngBuffer = await pngBlob.arrayBuffer();
    const pngBytes = new Uint8Array(pngBuffer);

    // Base64 encode
    let binary = '';
    for (let i = 0; i < pngBytes.length; i++) {
      binary += String.fromCharCode(pngBytes[i]);
    }
    const base64 = btoa(binary);

    // Generate escape sequence
    const sequence = `\x1b]1337;File=size=${pngBytes.length};width=${width}px;height=${height}px;inline=1:${base64}\x07`;

    return {
      sequence: sequence,
      width: width,
      height: height,
      size: pngBytes.length,
      base64Length: base64.length
    };
  }

  window.ITerm2Encoder = { encodeITerm2: encodeITerm2 };
})();
