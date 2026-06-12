/**
 * ImageLoader - Load images from files or URLs
 * 
 * Uses sharp library for image decoding.
 * Supports JPEG, PNG, GIF, WebP, TIFF, SVG, etc.
 */

const sharp = require('sharp');
const { Framebuffer } = require('./framebuffer');

class ImageLoader {
  /**
   * Load image from file path
   * @param {string} filePath - Path to image file
   * @returns {Promise<Framebuffer>} Loaded framebuffer
   */
  static async loadFromFile(filePath) {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return Framebuffer.fromRawData(info.width, info.height, data);
  }

  /**
   * Load image from URL
   * @param {string} url - URL to image
   * @returns {Promise<Framebuffer>} Loaded framebuffer
   */
  static async loadFromURL(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return ImageLoader.loadFromBuffer(buffer);
  }

  /**
   * Load image from buffer
   * @param {Buffer} buffer - Image data buffer
   * @returns {Promise<Framebuffer>} Loaded framebuffer
   */
  static async loadFromBuffer(buffer) {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return Framebuffer.fromRawData(info.width, info.height, data);
  }

  /**
   * Load and resize image
   * @param {string} source - File path or URL
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @param {Object} options - Options
   * @param {boolean} options.fit - Fit mode ('cover', 'contain', 'fill', 'inside', 'outside')
   * @param {string} options.kernel - Resize kernel ('nearest', 'cubic', 'mitchell', 'lanczos2', 'lanczos3')
   * @returns {Promise<Framebuffer>} Resized framebuffer
   */
  static async loadAndResize(source, targetWidth, targetHeight, options = {}) {
    const isURL = source.startsWith('http://') || source.startsWith('https://');
    
    let image;
    if (isURL) {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      image = sharp(buffer);
    } else {
      image = sharp(source);
    }

    const { data, info } = await image
      .resize(targetWidth, targetHeight, {
        fit: options.fit || 'inside',
        kernel: options.kernel || 'lanczos3',
        withoutEnlargement: true
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return Framebuffer.fromRawData(info.width, info.height, data);
  }

  /**
   * Get image metadata
   * @param {string} source - File path or URL
   * @returns {Promise<Object>} Image metadata
   */
  static async getMetadata(source) {
    const isURL = source.startsWith('http://') || source.startsWith('https://');
    
    let image;
    if (isURL) {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      image = sharp(buffer);
    } else {
      image = sharp(source);
    }

    return image.metadata();
  }
}

module.exports = { ImageLoader };
