/**
 * Color - Color space conversion utilities
 * 
 * Based on timg's LinearColor implementation.
 * Uses linear light space for accurate color calculations.
 */

/**
 * Linear color representation (in linear light space)
 * Used for accurate color distance calculations and averaging
 */
class LinearColor {
  /**
   * Create LinearColor from sRGB pixel
   * @param {Object} pixel - sRGB pixel {r, g, b, a} (0-255)
   */
  constructor(pixel) {
    // Convert sRGB to linear light (approximate x^2.2 with x^2)
    this.r = (pixel.r / 255) * (pixel.r / 255);
    this.g = (pixel.g / 255) * (pixel.g / 255);
    this.b = (pixel.b / 255) * (pixel.b / 255);
    this.a = pixel.a / 255;
  }

  /**
   * Create LinearColor from linear values
   * @param {number} r - Red (0-1, linear)
   * @param {number} g - Green (0-1, linear)
   * @param {number} b - Blue (0-1, linear)
   * @param {number} a - Alpha (0-1, linear)
   */
  static fromLinear(r, g, b, a = 1) {
    const color = Object.create(LinearColor.prototype);
    color.r = r;
    color.g = g;
    color.b = b;
    color.a = a;
    return color;
  }

  /**
   * Convert back to sRGB pixel (0-255)
   * @returns {Object} sRGB pixel {r, g, b, a}
   */
  toSRGB() {
    return {
      r: Math.round(Math.sqrt(this.r) * 255),
      g: Math.round(Math.sqrt(this.g) * 255),
      b: Math.round(Math.sqrt(this.b) * 255),
      a: Math.round(this.a * 255)
    };
  }

  /**
   * Add another LinearColor
   * @param {LinearColor} other - Color to add
   * @returns {LinearColor} New color
   */
  add(other) {
    return LinearColor.fromLinear(
      this.r + other.r,
      this.g + other.g,
      this.b + other.b,
      this.a + other.a
    );
  }

  /**
   * Multiply by scalar
   * @param {number} scalar - Multiplier
   * @returns {LinearColor} New color
   */
  multiply(scalar) {
    return LinearColor.fromLinear(
      this.r * scalar,
      this.g * scalar,
      this.b * scalar,
      this.a * scalar
    );
  }

  /**
   * Calculate squared distance to another color (RGB only, no alpha)
   * @param {LinearColor} other - Other color
   * @returns {number} Squared distance
   */
  distanceSquared(other) {
    const dr = this.r - other.r;
    const dg = this.g - other.g;
    const db = this.b - other.b;
    return dr * dr + dg * dg + db * db;
  }

  /**
   * Calculate average of multiple LinearColors
   * @param {LinearColor[]} colors - Array of colors
   * @returns {LinearColor} Average color
   */
  static average(colors) {
    if (colors.length === 0) {
      return LinearColor.fromLinear(0, 0, 0, 0);
    }

    let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
    for (const color of colors) {
      sumR += color.r;
      sumG += color.g;
      sumB += color.b;
      sumA += color.a;
    }

    const n = colors.length;
    return LinearColor.fromLinear(sumR / n, sumG / n, sumB / n, sumA / n);
  }

  /**
   * Calculate average distance of colors to their average
   * Used for finding best block character
   * @param {LinearColor[]} colors - Array of colors
   * @returns {Object} {average, distance}
   */
  static averageDistance(colors) {
    if (colors.length === 0) {
      return { average: LinearColor.fromLinear(0, 0, 0, 0), distance: 0 };
    }

    const average = LinearColor.average(colors);
    let distance = 0;
    for (const color of colors) {
      distance += color.distanceSquared(average);
    }

    return { average, distance };
  }
}

/**
 * Convert sRGB value to linear light
 * @param {number} v - sRGB value (0-255)
 * @returns {number} Linear light value (0-1)
 */
function srgbToLinear(v) {
  return (v / 255) * (v / 255);
}

/**
 * Convert linear light to sRGB
 * @param {number} v - Linear light value (0-1)
 * @returns {number} sRGB value (0-255)
 */
function linearToSrgb(v) {
  return Math.round(Math.sqrt(v) * 255);
}

/**
 * Map RGB to 256 color index
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} 256 color index (0-255)
 */
function rgbTo256(r, g, b) {
  // Grayscale
  if (r === g && g === b) {
    // 24 grayscale levels (232-255)
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round((r - 8) / 10) + 232;
  }

  // Color cube (6x6x6)
  const ri = Math.round(r / 255 * 5);
  const gi = Math.round(g / 255 * 5);
  const bi = Math.round(b / 255 * 5);
  return 16 + 36 * ri + 6 * gi + bi;
}

module.exports = {
  LinearColor,
  srgbToLinear,
  linearToSrgb,
  rgbTo256
};
