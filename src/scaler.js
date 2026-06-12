/**
 * Scaler - Image scaling utilities
 * 
 * Based on timg's image scaling algorithm.
 * Handles aspect ratio correction and character cell alignment.
 */

class Scaler {
  /**
   * Calculate target dimensions to fit within constraints
   * @param {number} imageWidth - Original image width
   * @param {number} imageHeight - Original image height
   * @param {number} maxWidth - Maximum width in characters
   * @param {number} maxHeight - Maximum height in characters
   * @param {Object} options - Options
   * @param {number} options.cellX - Pixels per character cell horizontally (default: 1)
   * @param {number} options.cellY - Pixels per character cell vertically (default: 2)
   * @param {number} options.widthStretch - Width stretch factor for aspect ratio correction
   * @param {boolean} options.upscale - Allow upscaling (default: false)
   * @returns {Object} {width, height} in pixels
   */
  static calculateScaleToFit(imageWidth, imageHeight, maxWidth, maxHeight, options = {}) {
    const cellX = options.cellX || 1;
    const cellY = options.cellY || 2;
    const widthStretch = options.widthStretch || 1.0;
    const upscale = options.upscale || false;

    // Convert character dimensions to pixel dimensions
    const maxPixelWidth = maxWidth * cellX;
    const maxPixelHeight = maxHeight * cellY;

    // Apply width stretch correction
    // If widthStretch > 1, pretend horizontal space is less
    // If widthStretch < 1, reduce vertical space
    const adjustedWidth = maxPixelWidth / widthStretch;
    const adjustedHeight = maxPixelHeight;

    // Calculate scale factors
    const scaleX = adjustedWidth / imageWidth;
    const scaleY = adjustedHeight / imageHeight;

    // Use smaller scale factor to fit within bounds
    let scale = Math.min(scaleX, scaleY);

    // Don't upscale unless allowed
    if (!upscale && scale > 1) {
      scale = 1;
    }

    // Calculate target dimensions
    let targetWidth = Math.floor(imageWidth * scale);
    let targetHeight = Math.floor(imageHeight * scale);

    // Align to character cell boundaries
    targetWidth = Math.floor(targetWidth / cellX) * cellX;
    targetHeight = Math.floor(targetHeight / cellY) * cellY;

    // Ensure minimum size
    targetWidth = Math.max(targetWidth, cellX);
    targetHeight = Math.max(targetHeight, cellY);

    return { width: targetWidth, height: targetHeight };
  }

  /**
   * Calculate dimensions for half-block rendering
   * Each character cell represents 1x2 pixels
   * @param {number} imageWidth - Original image width
   * @param {number} imageHeight - Original image height
   * @param {number} maxWidth - Maximum width in characters
   * @param {number} maxHeight - Maximum height in characters
   * @param {Object} options - Options
   * @returns {Object} {width, height} in pixels
   */
  static calculateHalfBlockSize(imageWidth, imageHeight, maxWidth, maxHeight, options = {}) {
    return Scaler.calculateScaleToFit(imageWidth, imageHeight, maxWidth, maxHeight, {
      ...options,
      cellX: 1,
      cellY: 2
    });
  }

  /**
   * Calculate dimensions for quarter-block rendering
   * Each character cell represents 2x2 pixels
   * @param {number} imageWidth - Original image width
   * @param {number} imageHeight - Original image height
   * @param {number} maxWidth - Maximum width in characters
   * @param {number} maxHeight - Maximum height in characters
   * @param {Object} options - Options
   * @returns {Object} {width, height} in pixels
   */
  static calculateQuarterBlockSize(imageWidth, imageHeight, maxWidth, maxHeight, options = {}) {
    return Scaler.calculateScaleToFit(imageWidth, imageHeight, maxWidth, maxHeight, {
      ...options,
      cellX: 2,
      cellY: 2
    });
  }

  /**
   * Calculate character dimensions from pixel dimensions
   * @param {number} pixelWidth - Width in pixels
   * @param {number} pixelHeight - Height in pixels
   * @param {number} cellX - Pixels per character cell horizontally
   * @param {number} cellY - Pixels per character cell vertically
   * @returns {Object} {cols, rows} in characters
   */
  static pixelsToCharacters(pixelWidth, pixelHeight, cellX = 1, cellY = 2) {
    return {
      cols: Math.ceil(pixelWidth / cellX),
      rows: Math.ceil(pixelHeight / cellY)
    };
  }

  /**
   * Resize framebuffer using bilinear interpolation
   * @param {Framebuffer} src - Source framebuffer
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @returns {Framebuffer} Resized framebuffer
   */
  static resizeBilinear(src, targetWidth, targetHeight) {
    const { Framebuffer } = require('./framebuffer');
    const dst = new Framebuffer(targetWidth, targetHeight);
    const scaleX = (src.width - 1) / (targetWidth - 1);
    const scaleY = (src.height - 1) / (targetHeight - 1);

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = x * scaleX;
        const srcY = y * scaleY;

        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = Math.min(x1 + 1, src.width - 1);
        const y2 = Math.min(y1 + 1, src.height - 1);

        const xWeight = srcX - x1;
        const yWeight = srcY - y1;

        const p1 = src.getPixel(x1, y1);
        const p2 = src.getPixel(x2, y1);
        const p3 = src.getPixel(x1, y2);
        const p4 = src.getPixel(x2, y2);

        const pixel = {
          r: Math.round(p1.r * (1 - xWeight) * (1 - yWeight) + p2.r * xWeight * (1 - yWeight) + p3.r * (1 - xWeight) * yWeight + p4.r * xWeight * yWeight),
          g: Math.round(p1.g * (1 - xWeight) * (1 - yWeight) + p2.g * xWeight * (1 - yWeight) + p3.g * (1 - xWeight) * yWeight + p4.g * xWeight * yWeight),
          b: Math.round(p1.b * (1 - xWeight) * (1 - yWeight) + p2.b * xWeight * (1 - yWeight) + p3.b * (1 - xWeight) * yWeight + p4.b * xWeight * yWeight),
          a: Math.round(p1.a * (1 - xWeight) * (1 - yWeight) + p2.a * xWeight * (1 - yWeight) + p3.a * (1 - xWeight) * yWeight + p4.a * xWeight * yWeight)
        };

        dst.setPixel(x, y, pixel);
      }
    }

    return dst;
  }

  /**
   * Resize framebuffer using nearest neighbor
   * @param {Framebuffer} src - Source framebuffer
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @returns {Framebuffer} Resized framebuffer
   */
  static resizeNearest(src, targetWidth, targetHeight) {
    const { Framebuffer } = require('./framebuffer');
    const dst = new Framebuffer(targetWidth, targetHeight);
    const scaleX = src.width / targetWidth;
    const scaleY = src.height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.min(Math.floor(x * scaleX), src.width - 1);
        const srcY = Math.min(Math.floor(y * scaleY), src.height - 1);
        dst.setPixel(x, y, src.getPixel(srcX, srcY));
      }
    }

    return dst;
  }
}

module.exports = { Scaler };
