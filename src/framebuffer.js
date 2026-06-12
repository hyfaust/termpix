/**
 * Framebuffer - Pixel data structure for image rendering
 * 
 * Based on timg's framebuffer implementation.
 * Stores RGBA pixels in a 2D array with row-major order.
 */

/**
 * RGBA pixel structure
 * @typedef {Object} RgbaPixel
 * @property {number} r - Red channel (0-255, sRGB gamma-corrected)
 * @property {number} g - Green channel (0-255, sRGB gamma-corrected)
 * @property {number} b - Blue channel (0-255, sRGB gamma-corrected)
 * @property {number} a - Alpha channel (0-255, linear)
 */

class Framebuffer {
  /**
   * Create a new Framebuffer
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // Store pixels as flat array for better performance
    // Each pixel takes 4 bytes (RGBA)
    this.data = new Uint8Array(width * height * 4);
  }

  /**
   * Get pixel at coordinates
   * @param {number} x - X coordinate (0-based)
   * @param {number} y - Y coordinate (0-based)
   * @returns {RgbaPixel} Pixel value
   */
  getPixel(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const offset = (y * this.width + x) * 4;
    return {
      r: this.data[offset],
      g: this.data[offset + 1],
      b: this.data[offset + 2],
      a: this.data[offset + 3]
    };
  }

  /**
   * Set pixel at coordinates
   * @param {number} x - X coordinate (0-based)
   * @param {number} y - Y coordinate (0-based)
   * @param {RgbaPixel} pixel - Pixel value
   */
  setPixel(x, y, pixel) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const offset = (y * this.width + x) * 4;
    this.data[offset] = pixel.r;
    this.data[offset + 1] = pixel.g;
    this.data[offset + 2] = pixel.b;
    this.data[offset + 3] = pixel.a;
  }

  /**
   * Clear framebuffer with a color
   * @param {RgbaPixel} color - Fill color (default: transparent black)
   */
  clear(color = { r: 0, g: 0, b: 0, a: 0 }) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = color.r;
      this.data[i + 1] = color.g;
      this.data[i + 2] = color.b;
      this.data[i + 3] = color.a;
    }
  }

  /**
   * Get raw pixel data as Uint8Array
   * @returns {Uint8Array} Raw RGBA data
   */
  getRawData() {
    return this.data;
  }

  /**
   * Create Framebuffer from raw RGBA data
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   * @param {Uint8Array} data - Raw RGBA data
   * @returns {Framebuffer} New Framebuffer instance
   */
  static fromRawData(width, height, data) {
    const fb = new Framebuffer(width, height);
    fb.data.set(data);
    return fb;
  }

  /**
   * Check if pixel is transparent
   * @param {RgbaPixel} pixel - Pixel to check
   * @returns {boolean} True if pixel is fully transparent
   */
  static isTransparent(pixel) {
    return pixel.a === 0;
  }

  /**
   * Check if pixel is opaque
   * @param {RgbaPixel} pixel - Pixel to check
   * @returns {boolean} True if pixel is fully opaque
   */
  static isOpaque(pixel) {
    return pixel.a === 255;
  }

  /**
   * Compare two pixels for equality
   * @param {RgbaPixel} a - First pixel
   * @param {RgbaPixel} b - Second pixel
   * @returns {boolean} True if pixels are equal
   */
  static pixelsEqual(a, b) {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  }

  /**
   * Alpha compose pixel over background
   * @param {RgbaPixel} pixel - Foreground pixel
   * @param {RgbaPixel} bg - Background pixel
   * @returns {RgbaPixel} Composited pixel
   */
  static alphaCompose(pixel, bg) {
    if (pixel.a === 255) {
      return pixel;
    }
    if (pixel.a === 0) {
      return bg;
    }

    const alpha = pixel.a / 255;
    const invAlpha = 1 - alpha;

    return {
      r: Math.round(pixel.r * alpha + bg.r * invAlpha),
      g: Math.round(pixel.g * alpha + bg.g * invAlpha),
      b: Math.round(pixel.b * alpha + bg.b * invAlpha),
      a: 255
    };
  }

  /**
   * Alpha compose entire framebuffer over background color
   * @param {RgbaPixel} bgColor - Background color
   * @param {boolean} checkerboard - Use checkerboard pattern for transparency
   */
  alphaComposeBackground(bgColor, checkerboard = false) {
    const checkerLight = { r: 153, g: 153, b: 153, a: 255 };
    const checkerDark = { r: 102, g: 102, b: 102, a: 255 };
    const checkerSize = 8;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pixel = this.getPixel(x, y);
        if (pixel.a < 255) {
          let bg = bgColor;
          if (checkerboard) {
            const checkerX = Math.floor(x / checkerSize);
            const checkerY = Math.floor(y / checkerSize);
            bg = (checkerX + checkerY) % 2 === 0 ? checkerLight : checkerDark;
          }
          this.setPixel(x, y, Framebuffer.alphaCompose(pixel, bg));
        }
      }
    }
  }

  /**
   * Clone this framebuffer
   * @returns {Framebuffer} New Framebuffer with same data
   */
  clone() {
    const fb = new Framebuffer(this.width, this.height);
    fb.data.set(this.data);
    return fb;
  }
}

module.exports = { Framebuffer };
