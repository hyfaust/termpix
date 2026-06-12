/**
 * HalfBlockRenderer - Render using Unicode half-block characters
 * 
 * Each character cell represents 1x2 pixels:
 * - Background color = top pixel
 * - Foreground color = bottom pixel
 * - Character = ▄ (U+2584, LOWER HALF BLOCK)
 * 
 * For odd heights, uses ▀ (U+2580, UPPER HALF BLOCK) for the last row.
 */

const { BaseRenderer } = require('./base');
const { Terminal } = require('../terminal');
const { Scaler } = require('../scaler');
const { rgbTo256 } = require('../color');
const { Framebuffer } = require('../framebuffer');

class HalfBlockRenderer extends BaseRenderer {
  /**
   * Create a new HalfBlockRenderer
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
    return 'half-block';
  }

  /**
   * Get cell dimensions (1x2 pixels per cell)
   * @returns {Object} {cellX, cellY}
   */
  getCellDimensions() {
    return { cellX: 1, cellY: 2 };
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
    const { width, height } = Scaler.calculateHalfBlockSize(
      fb.width, fb.height,
      this.maxWidth, this.maxHeight
    );

    // Resize if needed
    const resized = this.resize(fb, width, height);

    // Render to string
    return this.renderHalfBlocks(resized);
  }

  /**
   * Resize framebuffer
   * @param {Framebuffer} fb - Source framebuffer
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @returns {Framebuffer} Resized framebuffer
   */
  resize(fb, targetWidth, targetHeight) {
    // For now, use simple nearest-neighbor scaling
    // TODO: Implement better scaling algorithm
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
   * Render framebuffer using half-block characters
   * @param {Framebuffer} fb - Framebuffer to render
   * @returns {string} Rendered output
   */
  renderHalfBlocks(fb) {
    const output = [];
    const { width, height } = fb;

    // Process rows in pairs (2 pixels per character)
    for (let y = 0; y < height; y += 2) {
      const line = [];

      for (let x = 0; x < width; x++) {
        const topPixel = fb.getPixel(x, y);
        const bottomPixel = y + 1 < height ? fb.getPixel(x, y + 1) : null;

        if (bottomPixel === null) {
          // Odd height: use upper half block
          line.push(this.renderUpperHalfBlock(topPixel));
        } else {
          // Normal: use lower half block
          line.push(this.renderLowerHalfBlock(topPixel, bottomPixel));
        }
      }

      output.push(line.join('') + Terminal.reset());
    }

    return output.join('\n');
  }

  /**
   * Render a lower half-block character (▄)
   * @param {Object} topPixel - Top pixel color
   * @param {Object} bottomPixel - Bottom pixel color
   * @returns {string} Rendered character
   */
  renderLowerHalfBlock(topPixel, bottomPixel) {
    // Background = top pixel, Foreground = bottom pixel
    const bg = this.colorToAnsi(topPixel, true);
    const fg = this.colorToAnsi(bottomPixel, false);
    return `${bg}${fg}▄`;
  }

  /**
   * Render an upper half-block character (▀)
   * @param {Object} pixel - Pixel color
   * @returns {string} Rendered character
   */
  renderUpperHalfBlock(pixel) {
    // Foreground = pixel color, Background = background color
    const fg = this.colorToAnsi(pixel, false);
    const bg = this.colorToAnsi(this.backgroundColor, true);
    return `${bg}${fg}▀`;
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

module.exports = { HalfBlockRenderer };
