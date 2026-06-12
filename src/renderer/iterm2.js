/**
 * iTerm2Renderer - Render using iTerm2 inline image protocol
 * 
 * Uses the iTerm2 Graphics Protocol to display images at full resolution.
 * Protocol format: ESC ] 1337 ; File=size=N;width=Wpx;height=Hpx;inline=1:<base64> BEL
 * 
 * Supported terminals: iTerm2, WezTerm, VS Code, Warp, mintty, rio
 */

const sharp = require('sharp');
const { BaseRenderer } = require('./base');
const { Terminal } = require('../terminal');
const { Scaler } = require('../scaler');
const { Framebuffer } = require('../framebuffer');

class iTerm2Renderer extends BaseRenderer {
  /**
   * Create a new iTerm2Renderer
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
    return 'iterm2';
  }

  /**
   * Get cell dimensions (not applicable for iTerm2 protocol)
   * @returns {Object} {cellX, cellY}
   */
  getCellDimensions() {
    return { cellX: 1, cellY: 1 };
  }

  /**
   * Render framebuffer to string
   * @param {Framebuffer} framebuffer - Framebuffer to render
   * @returns {Promise<string>} Rendered output (escape sequence)
   */
  async render(framebuffer) {
    // Alpha compose with background
    const fb = framebuffer.clone();
    fb.alphaComposeBackground(this.backgroundColor, this.checkerboard);

    let targetFb;
    let width, height;

    if (this.noResize) {
      // Keep original resolution
      targetFb = fb;
      width = fb.width;
      height = fb.height;
    } else {
      // Calculate target size
      const target = Scaler.calculateScaleToFit(
        fb.width, fb.height,
        this.maxWidth, this.maxHeight,
        { cellX: 1, cellY: 1 }
      );
      width = target.width;
      height = target.height;

      // Resize if needed
      targetFb = await this.resize(fb, width, height);
    }

    // Encode to PNG
    const pngData = await this.encodeToPNG(targetFb);

    // Generate escape sequence
    return this.generateEscapeSequence(pngData, width, height);
  }

  /**
   * Resize framebuffer
   * @param {Framebuffer} fb - Source framebuffer
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @returns {Promise<Framebuffer>} Resized framebuffer
   */
  async resize(fb, targetWidth, targetHeight) {
    // Use sharp for high-quality resizing
    const rawData = Buffer.from(fb.getRawData());
    
    const resizedBuffer = await sharp(rawData, {
      raw: {
        width: fb.width,
        height: fb.height,
        channels: 4
      }
    })
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
        kernel: 'lanczos3'
      })
      .raw()
      .toBuffer();

    return Framebuffer.fromRawData(targetWidth, targetHeight, resizedBuffer);
  }

  /**
   * Encode framebuffer to PNG
   * @param {Framebuffer} fb - Framebuffer to encode
   * @returns {Promise<Buffer>} PNG data
   */
  async encodeToPNG(fb) {
    const rawData = Buffer.from(fb.getRawData());
    
    return sharp(rawData, {
      raw: {
        width: fb.width,
        height: fb.height,
        channels: 4
      }
    })
      .png({
        compressionLevel: 1, // Fast compression
        palette: false
      })
      .toBuffer();
  }

  /**
   * Generate iTerm2 escape sequence
   * @param {Buffer} pngData - PNG image data
   * @param {number} width - Image width in pixels
   * @param {number} height - Image height in pixels
   * @returns {string} Escape sequence
   */
  generateEscapeSequence(pngData, width, height) {
    const base64 = pngData.toString('base64');
    return `\x1b]1337;File=size=${pngData.length};width=${width}px;height=${height}px;inline=1:${base64}\x07`;
  }

  /**
   * Check if current terminal supports iTerm2 protocol
   * @returns {boolean} True if supported
   */
  static isSupported() {
    const termProgram = process.env.TERM_PROGRAM || '';
    const supportedTerminals = ['iTerm', 'WezTerm', 'mintty', 'rio', 'WarpTerminal', 'vscode'];
    
    return supportedTerminals.some(t => termProgram.includes(t));
  }
}

module.exports = { iTerm2Renderer };
