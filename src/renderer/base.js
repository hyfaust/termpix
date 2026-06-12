/**
 * BaseRenderer - Base class for all renderers
 */

class BaseRenderer {
  /**
   * Create a new renderer
   * @param {Object} options - Renderer options
   * @param {number} options.maxWidth - Maximum width in characters
   * @param {number} options.maxHeight - Maximum height in characters
   * @param {Object} options.backgroundColor - Background color {r, g, b}
   * @param {boolean} options.checkerboard - Use checkerboard for transparency
   * @param {boolean} options.use256Colors - Use 256 colors instead of truecolor
   * @param {boolean} options.noResize - Keep original resolution (for iterm2 mode)
   */
  constructor(options = {}) {
    this.maxWidth = options.maxWidth || 80;
    this.maxHeight = options.maxHeight || 24;
    this.backgroundColor = options.backgroundColor || { r: 0, g: 0, b: 0 };
    this.checkerboard = options.checkerboard || false;
    this.use256Colors = options.use256Colors || false;
    this.noResize = options.noResize || false;
  }

  /**
   * Render framebuffer to string
   * @param {Framebuffer} framebuffer - Framebuffer to render
   * @returns {string} Rendered output
   */
  render(framebuffer) {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Get renderer name
   * @returns {string} Renderer name
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * Get cell dimensions
   * @returns {Object} {cellX, cellY}
   */
  getCellDimensions() {
    throw new Error('getCellDimensions() must be implemented by subclass');
  }
}

module.exports = { BaseRenderer };
