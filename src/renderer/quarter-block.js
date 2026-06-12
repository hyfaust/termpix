/**
 * QuarterBlockRenderer - Render using Unicode quarter-block characters
 * 
 * Each character cell represents 2x2 pixels.
 * Uses timg's FindBestGlyph algorithm to find the optimal character.
 * 
 * Supported characters:
 * - " " (space) - background only
 * - "▘" (U+2598) - top-left quarter
 * - "▝" (U+259D) - top-right quarter
 * - "▖" (U+2596) - bottom-left quarter
 * - "▗" (U+2597) - bottom-right quarter
 * - "▌" (U+258C) - left half
 * - "▀" (U+2580) - top half
 * - "▄" (U+2584) - bottom half
 * - "▚" (U+259A) - top-left + bottom-right
 * - "▞" (U+259E) - top-right + bottom-left
 * - "▙" (U+2599) - all except top-right
 * - "▟" (U+259F) - all except top-left
 * - "▛" (U+259B) - all except bottom-right
 * - "▜" (U+259C) - all except bottom-left
 * - "█" (U+2588) - full block
 */

const { BaseRenderer } = require('./base');
const { Terminal } = require('../terminal');
const { Scaler } = require('../scaler');
const { LinearColor, rgbTo256 } = require('../color');
const { Framebuffer } = require('../framebuffer');

// Block character definitions
const BLOCK_CHARS = {
  SPACE: { char: ' ', fg: null, bg: null },
  TOP_LEFT: { char: '▘', fg: 'tl', bg: ['tr', 'bl', 'br'] },
  TOP_RIGHT: { char: '▝', fg: 'tr', bg: ['tl', 'bl', 'br'] },
  BOT_LEFT: { char: '▖', fg: 'bl', bg: ['tl', 'tr', 'br'] },
  BOT_RIGHT: { char: '▗', fg: 'br', bg: ['tl', 'tr', 'bl'] },
  LEFT_BAR: { char: '▌', fg: ['tl', 'bl'], bg: ['tr', 'br'] },
  TOP_BAR: { char: '▀', fg: ['tl', 'tr'], bg: ['bl', 'br'] },
  BOT_BAR: { char: '▄', fg: ['bl', 'br'], bg: ['tl', 'tr'] },
  TL_BR: { char: '▚', fg: ['tl', 'br'], bg: ['tr', 'bl'] },
  TR_BL: { char: '▞', fg: ['tr', 'bl'], bg: ['tl', 'br'] },
  ALL_BUT_TR: { char: '▙', fg: ['tl', 'bl', 'br'], bg: ['tr'] },
  ALL_BUT_TL: { char: '▟', fg: ['tr', 'bl', 'br'], bg: ['tl'] },
  ALL_BUT_BR: { char: '▛', fg: ['tl', 'tr', 'bl'], bg: ['br'] },
  ALL_BUT_BL: { char: '▜', fg: ['tl', 'tr', 'br'], bg: ['bl'] },
  FULL: { char: '█', fg: ['tl', 'tr', 'bl', 'br'], bg: null }
};

class QuarterBlockRenderer extends BaseRenderer {
  /**
   * Create a new QuarterBlockRenderer
   * @param {Object} options - Renderer options
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * Get renderer name
   * @returns {string}
   */
  getName() {
    return 'quarter-block';
  }

  /**
   * Get cell dimensions (2x2 pixels per cell)
   * @returns {Object} {cellX, cellY}
   */
  getCellDimensions() {
    return { cellX: 2, cellY: 2 };
  }

  /**
   * Render framebuffer to string
   * @param {Framebuffer} framebuffer - Framebuffer to render
   * @returns {string} Rendered output
   */
  render(framebuffer) {
    // Alpha compose with background
    const fb = framebuffer.clone();
    fb.alphaComposeBackground(this.backgroundColor, this.checkerboard);

    // Calculate target size
    const { width, height } = Scaler.calculateQuarterBlockSize(
      fb.width, fb.height,
      this.maxWidth, this.maxHeight
    );

    // Resize if needed
    const resized = this.resize(fb, width, height);

    // Render to string
    return this.renderQuarterBlocks(resized);
  }

  /**
   * Resize framebuffer
   * @param {Framebuffer} fb - Source framebuffer
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @returns {Framebuffer} Resized framebuffer
   */
  resize(fb, targetWidth, targetHeight) {
    const resized = new Framebuffer(targetWidth, targetHeight);
    const scaleX = fb.width / targetWidth;
    const scaleY = fb.height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.min(Math.floor(x * scaleX), fb.width - 1);
        const srcY = Math.min(Math.floor(y * scaleY), fb.height - 1);
        resized.setPixel(x, y, fb.getPixel(srcX, srcY));
      }
    }

    return resized;
  }

  /**
   * Render framebuffer using quarter-block characters
   * @param {Framebuffer} fb - Framebuffer to render
   * @returns {string} Rendered output
   */
  renderQuarterBlocks(fb) {
    const output = [];
    const { width, height } = fb;

    // Process rows in pairs (2 pixels per character vertically)
    for (let y = 0; y < height; y += 2) {
      const line = [];

      // Process columns in pairs (2 pixels per character horizontally)
      for (let x = 0; x < width; x += 2) {
        // Get 2x2 pixel block
        const pixels = {
          tl: fb.getPixel(x, y),
          tr: x + 1 < width ? fb.getPixel(x + 1, y) : null,
          bl: y + 1 < height ? fb.getPixel(x, y + 1) : null,
          br: (x + 1 < width && y + 1 < height) ? fb.getPixel(x + 1, y + 1) : null
        };

        // Find best character for this block
        const best = this.findBestGlyph(pixels);
        line.push(best);
      }

      output.push(line.join('') + Terminal.reset());
    }

    return output.join('\n');
  }

  /**
   * Find the best glyph for a 2x2 pixel block
   * Based on timg's FindBestGlyph algorithm
   * @param {Object} pixels - {tl, tr, bl, br} pixels
   * @returns {string} Rendered character with ANSI colors
   */
  findBestGlyph(pixels) {
    const { tl, tr, bl, br } = pixels;

    // Handle null pixels (edges)
    if (!tr && !bl && !br) {
      // Single pixel - use background color
      return this.renderSinglePixel(tl);
    }
    if (!tr && !bl) {
      // Two pixels vertically - use half block
      return this.renderVerticalPair(tl, br);
    }
    if (!bl && !br) {
      // Two pixels horizontally - use half block
      return this.renderHorizontalPair(tl, tr);
    }
    if (!tr) {
      // Three pixels - use appropriate block
      return this.renderThreePixels(tl, bl, br);
    }
    if (!bl) {
      // Three pixels - use appropriate block
      return this.renderThreePixels(tl, tr, br);
    }

    // Full 2x2 block - use timg's algorithm
    return this.findBestGlyphFull(tl, tr, bl, br);
  }

  /**
   * Find best glyph for full 2x2 block
   * @param {Object} tl - Top-left pixel
   * @param {Object} tr - Top-right pixel
   * @param {Object} bl - Bottom-left pixel
   * @param {Object} br - Bottom-right pixel
   * @returns {string} Rendered character
   */
  findBestGlyphFull(tl, tr, bl, br) {
    // Convert to linear color space
    const linear = {
      tl: new LinearColor(tl),
      tr: new LinearColor(tr),
      bl: new LinearColor(bl),
      br: new LinearColor(br)
    };

    let bestDistance = Infinity;
    let bestChoice = null;

    // Try each block character
    for (const [key, block] of Object.entries(BLOCK_CHARS)) {
      // Skip single-pixel blocks for full 2x2
      if (key === 'SPACE' || key === 'TOP_LEFT' || key === 'TOP_RIGHT' || 
          key === 'BOT_LEFT' || key === 'BOT_RIGHT') {
        continue;
      }

      const distance = this.calculateBlockDistance(linear, block);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestChoice = { block, distance };
      }

      // Early termination if distance is very small
      if (distance < 0.001) {
        break;
      }
    }

    // Render the best choice
    return this.renderBlockChoice(tl, tr, bl, br, bestChoice.block);
  }

  /**
   * Calculate distance for a block character choice
   * @param {Object} linear - Linear color pixels {tl, tr, bl, br}
   * @param {Object} block - Block character definition
   * @returns {number} Total distance
   */
  calculateBlockDistance(linear, block) {
    let totalDistance = 0;

    // Calculate foreground distance
    if (block.fg) {
      const fgPixels = this.getPixelGroup(linear, block.fg);
      const { distance } = LinearColor.averageDistance(fgPixels);
      totalDistance += distance;
    }

    // Calculate background distance
    if (block.bg) {
      const bgPixels = this.getPixelGroup(linear, block.bg);
      const { distance } = LinearColor.averageDistance(bgPixels);
      totalDistance += distance;
    }

    return totalDistance;
  }

  /**
   * Get group of pixels by position keys
   * @param {Object} linear - Linear color pixels
   * @param {string|string[]} positions - Position key(s)
   * @returns {LinearColor[]} Array of linear colors
   */
  getPixelGroup(linear, positions) {
    if (typeof positions === 'string') {
      return [linear[positions]];
    }
    return positions.map(pos => linear[pos]);
  }

  /**
   * Render a block choice
   * @param {Object} tl - Top-left pixel
   * @param {Object} tr - Top-right pixel
   * @param {Object} bl - Bottom-left pixel
   * @param {Object} br - Bottom-right pixel
   * @param {Object} block - Block character definition
   * @returns {string} Rendered character
   */
  renderBlockChoice(tl, tr, bl, br, block) {
    const pixels = { tl, tr, bl, br };

    // Calculate foreground color
    let fgColor = this.backgroundColor;
    if (block.fg) {
      const fgPixels = this.getPixelGroup(pixels, block.fg);
      fgColor = this.averageColor(fgPixels);
    }

    // Calculate background color
    let bgColor = this.backgroundColor;
    if (block.bg) {
      const bgPixels = this.getPixelGroup(pixels, block.bg);
      bgColor = this.averageColor(bgPixels);
    }

    // Render with ANSI colors
    const fg = this.colorToAnsi(fgColor, false);
    const bg = this.colorToAnsi(bgColor, true);
    return `${bg}${fg}${block.char}`;
  }

  /**
   * Calculate average color of pixels
   * @param {Object[]} pixels - Array of RGBA pixels
   * @returns {Object} Average color {r, g, b}
   */
  averageColor(pixels) {
    if (pixels.length === 0) return this.backgroundColor;

    let sumR = 0, sumG = 0, sumB = 0;
    for (const pixel of pixels) {
      sumR += pixel.r;
      sumG += pixel.g;
      sumB += pixel.b;
    }

    const n = pixels.length;
    return {
      r: Math.round(sumR / n),
      g: Math.round(sumG / n),
      b: Math.round(sumB / n)
    };
  }

  /**
   * Render single pixel
   * @param {Object} pixel - Pixel color
   * @returns {string} Rendered character
   */
  renderSinglePixel(pixel) {
    const fg = this.colorToAnsi(pixel, false);
    const bg = this.colorToAnsi(this.backgroundColor, true);
    return `${bg}${fg}█`;
  }

  /**
   * Render vertical pair
   * @param {Object} top - Top pixel
   * @param {Object} bottom - Bottom pixel
   * @returns {string} Rendered character
   */
  renderVerticalPair(top, bottom) {
    const bg = this.colorToAnsi(top, true);
    const fg = this.colorToAnsi(bottom, false);
    return `${bg}${fg}▄`;
  }

  /**
   * Render horizontal pair
   * @param {Object} left - Left pixel
   * @param {Object} right - Right pixel
   * @returns {string} Rendered character
   */
  renderHorizontalPair(left, right) {
    const fg = this.colorToAnsi(left, false);
    const bg = this.colorToAnsi(right, true);
    return `${bg}${fg}▌`;
  }

  /**
   * Render three pixels
   * @param {Object} p1 - First pixel
   * @param {Object} p2 - Second pixel
   * @param {Object} p3 - Third pixel
   * @returns {string} Rendered character
   */
  renderThreePixels(p1, p2, p3) {
    // Use average of three pixels as background
    const avg = this.averageColor([p1, p2, p3]);
    const bg = this.colorToAnsi(avg, true);
    const fg = this.colorToAnsi(this.backgroundColor, false);
    return `${bg}${fg}█`;
  }

  /**
   * Convert RGB color to ANSI escape sequence
   * @param {Object} color - Color {r, g, b}
   * @param {boolean} isBackground - Is background color
   * @returns {string} ANSI escape sequence
   */
  colorToAnsi(color, isBackground) {
    if (this.use256Colors) {
      const index = rgbTo256(color.r, color.g, color.b);
      return isBackground ? Terminal.backgroundColor256(index) : Terminal.foregroundColor256(index);
    }
    return isBackground
      ? Terminal.backgroundColor(color.r, color.g, color.b)
      : Terminal.foregroundColor(color.r, color.g, color.b);
  }
}

module.exports = { QuarterBlockRenderer };
