/**
 * iTerm2Decoder - Decode iTerm2 inline image protocol
 * 
 * Parses iTerm2 Graphics Protocol escape sequences and extracts image data.
 * Protocol format: ESC ] 1337 ; File=size=N;width=Wpx;height=Hpx;inline=1:<base64> BEL
 */

const sharp = require('sharp');
const { Framebuffer } = require('./framebuffer');

/**
 * iTerm2 protocol parsed result
 * @typedef {Object} ITerm2Parsed
 * @property {number} size - Original data size in bytes
 * @property {number|null} width - Image width in pixels
 * @property {number|null} height - Image height in pixels
 * @property {boolean} inline - Whether image is inline
 * @property {string} base64 - Base64 encoded image data
 * @property {Buffer} data - Raw image data (PNG/JPEG/etc)
 */

class iTerm2Decoder {
  /**
   * Regular expression to match iTerm2 escape sequences
   * Matches: ESC ] 1337 ; File=...<params>... : <base64data> BEL
   * Also handles ST (String Terminator) = ESC \
   */
  static PATTERN = /\x1b\]1337;File=([^\x07\x1b]*?)(?:\x07|\x1b\\)([\s\S]*?)(?=\x1b\]1337;File=|\x1b\]1337;|\s*$)/g;
  
  /**
   * Simpler pattern for single sequence extraction
   */
  static SINGLE_PATTERN = /\x1b\]1337;File=([^\x07\x1b]*?):([A-Za-z0-9+/=]+)(?:\x07|\x1b\\)/;

  /**
   * Parse parameters string from iTerm2 protocol
   * @param {string} paramsStr - Parameters string (e.g., "size=1234;width=100px;height=50px;inline=1")
   * @returns {Object} Parsed parameters
   */
  static parseParams(paramsStr) {
    const params = {};
    const pairs = paramsStr.split(';');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        params[key.trim()] = value.trim();
      }
    }
    
    return params;
  }

  /**
   * Parse dimension value (removes 'px', '%', 'c', 'r' suffixes)
   * @param {string} value - Dimension value (e.g., "100px", "50%", "3c")
   * @returns {number|null} Numeric value or null
   */
  static parseDimension(value) {
    if (!value) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Decode a single iTerm2 escape sequence
   * @param {string} sequence - Complete escape sequence
   * @returns {ITerm2Parsed|null} Parsed result or null if not a valid sequence
   */
  static decodeSequence(sequence) {
    const match = iTerm2Decoder.SINGLE_PATTERN.exec(sequence);
    if (!match) {
      return null;
    }

    const paramsStr = match[1];
    const base64Data = match[2];
    
    const params = iTerm2Decoder.parseParams(paramsStr);
    
    return {
      size: parseInt(params.size, 10) || 0,
      width: iTerm2Decoder.parseDimension(params.width),
      height: iTerm2Decoder.parseDimension(params.height),
      inline: params.inline === '1',
      name: params.name ? Buffer.from(params.name, 'base64').toString('utf-8') : null,
      base64: base64Data,
      data: Buffer.from(base64Data, 'base64')
    };
  }

  /**
   * Find all iTerm2 escape sequences in text
   * @param {string} text - Text containing escape sequences
   * @returns {ITerm2Parsed[]} Array of parsed results
   */
  static findAll(text) {
    const results = [];
    const pattern = /\x1b\]1337;File=([^\x07\x1b]*?):([A-Za-z0-9+/=]+)(?:\x07|\x1b\\)/g;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const paramsStr = match[1];
      const base64Data = match[2];
      
      const params = iTerm2Decoder.parseParams(paramsStr);
      
      results.push({
        size: parseInt(params.size, 10) || 0,
        width: iTerm2Decoder.parseDimension(params.width),
        height: iTerm2Decoder.parseDimension(params.height),
        inline: params.inline === '1',
        name: params.name ? Buffer.from(params.name, 'base64').toString('utf-8') : null,
        base64: base64Data,
        data: Buffer.from(base64Data, 'base64'),
        sequence: match[0],
        index: match.index
      });
    }
    
    return results;
  }

  /**
   * Extract image data from iTerm2 escape sequence
   * @param {string} sequence - Complete escape sequence
   * @returns {Promise<Buffer>} Image data buffer (PNG format)
   */
  static async extractImageData(sequence) {
    const parsed = iTerm2Decoder.decodeSequence(sequence);
    if (!parsed) {
      throw new Error('Invalid iTerm2 escape sequence');
    }
    return parsed.data;
  }

  /**
   * Decode iTerm2 escape sequence to Framebuffer
   * @param {string} sequence - Complete escape sequence
   * @returns {Promise<Framebuffer>} Decoded framebuffer
   */
  static async decodeToFramebuffer(sequence) {
    const parsed = iTerm2Decoder.decodeSequence(sequence);
    if (!parsed) {
      throw new Error('Invalid iTerm2 escape sequence');
    }

    // Decode image using sharp
    const image = sharp(parsed.data);
    const metadata = await image.metadata();
    
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return Framebuffer.fromRawData(info.width, info.height, data);
  }

  /**
   * Decode iTerm2 escape sequence to PNG buffer
   * @param {string} sequence - Complete escape sequence
   * @returns {Promise<Buffer>} PNG data
   */
  static async decodeToPNG(sequence) {
    const parsed = iTerm2Decoder.decodeSequence(sequence);
    if (!parsed) {
      throw new Error('Invalid iTerm2 escape sequence');
    }

    // Convert to PNG if not already
    return sharp(parsed.data)
      .png()
      .toBuffer();
  }

  /**
   * Decode iTerm2 escape sequence to JPEG buffer
   * @param {string} sequence - Complete escape sequence
   * @param {number} quality - JPEG quality (1-100, default 90)
   * @returns {Promise<Buffer>} JPEG data
   */
  static async decodeToJPEG(sequence, quality = 90) {
    const parsed = iTerm2Decoder.decodeSequence(sequence);
    if (!parsed) {
      throw new Error('Invalid iTerm2 escape sequence');
    }

    return sharp(parsed.data)
      .jpeg({ quality })
      .toBuffer();
  }

  /**
   * Get metadata from iTerm2 escape sequence
   * @param {string} sequence - Complete escape sequence
   * @returns {Promise<Object>} Image metadata
   */
  static async getMetadata(sequence) {
    const parsed = iTerm2Decoder.decodeSequence(sequence);
    if (!parsed) {
      throw new Error('Invalid iTerm2 escape sequence');
    }

    const image = sharp(parsed.data);
    const metadata = await image.metadata();

    return {
      protocol: {
        size: parsed.size,
        width: parsed.width,
        height: parsed.height,
        inline: parsed.inline,
        name: parsed.name
      },
      image: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        density: metadata.density,
        size: metadata.size
      }
    };
  }

  /**
   * Check if text contains iTerm2 escape sequences
   * @param {string} text - Text to check
   * @returns {boolean} True if contains iTerm2 sequences
   */
  static containsITerm2(text) {
    return /\x1b\]1337;File=/.test(text);
  }

  /**
   * Strip iTerm2 escape sequences from text
   * @param {string} text - Text containing sequences
   * @returns {string} Text without sequences
   */
  static stripSequences(text) {
    return text.replace(/\x1b\]1337;File=[^\x07\x1b]*?(?:\x07|\x1b\\)/g, '');
  }

  /**
   * Replace iTerm2 escape sequences with placeholder text
   * @param {string} text - Text containing sequences
   * @param {string} placeholder - Replacement text (default: '[IMAGE]')
   * @returns {string} Text with sequences replaced
   */
  static replaceSequences(text, placeholder = '[IMAGE]') {
    return text.replace(/\x1b\]1337;File=[^\x07\x1b]*?(?:\x07|\x1b\\)/g, placeholder);
  }
}

module.exports = { iTerm2Decoder };
