/**
 * SixelRenderer - Render using Sixel protocol
 *
 * Uses quantize.js for color quantization and sixel-encoder.js for encoding.
 */

'use strict';

const { BaseRenderer } = require('./base');
const { Scaler } = require('../scaler');
const { Framebuffer } = require('../framebuffer');
const { medianCut, pnnQuant } = require('../quantize');
const { encodeSixel } = require('../sixel-encoder');
const { applyBayerDither, applyFloydSteinberg } = require('../dither');

class SixelRenderer extends BaseRenderer {
  constructor(options = {}) {
    super(options);
    this.maxColors = options.maxColors || 256;
    this.quantizeAlgorithm = options.quantizeAlgorithm || 'median-cut';
    this.ditherMode = options.ditherMode || 'fs';
    this.rlePolicy = options.rlePolicy || 'auto';
    this.griLimit = options.griLimit || false;
    this.eightBit = options.eightBit || false;
  }

  getName() {
    return 'sixel';
  }

  getCellDimensions() {
    return { cellX: 1, cellY: 1 };
  }

  render(framebuffer) {
    const fb = framebuffer.clone();
    fb.alphaComposeBackground(this.backgroundColor, this.checkerboard);

    let targetFb;
    let width, height;

    if (this.noResize) {
      targetFb = fb;
      width = fb.width;
      height = fb.height;
    } else {
      const target = Scaler.calculateScaleToFit(
        fb.width, fb.height,
        this.maxWidth * 8, this.maxHeight * 6,
        { cellX: 1, cellY: 1 }
      );
      width = target.width;
      height = target.height;
      targetFb = Scaler.resizeBilinear(fb, width, height);
    }

    // Get raw RGBA data
    const rgba = targetFb.getRawData();

    // Apply Bayer dither before quantization
    let quantInput = rgba;
    if (this.ditherMode === 'bayer') {
      const amplitude = 255.0 / this.maxColors;
      quantInput = applyBayerDither(rgba, width, height, amplitude);
    }

    // Quantize
    let result;
    if (this.quantizeAlgorithm === 'pnn') {
      result = pnnQuant(quantInput, width, height, this.maxColors);
    } else {
      result = medianCut(quantInput, width, height, this.maxColors);
    }

    // Apply Floyd-Steinberg dither after quantization
    let pixels = result.pixels;
    if (this.ditherMode === 'fs') {
      // Check if FS is needed (skip if unique colors <= palette size)
      const uniqueColors = new Set(pixels).size;
      if (uniqueColors > this.maxColors) {
        pixels = applyFloydSteinberg(rgba, pixels, result.palette, width, height);
      }
    }

    // Encode to Sixel
    const sixelBytes = encodeSixel(pixels, result.palette, width, height, {
      eightBit: this.eightBit,
      griLimit: this.griLimit,
      encodePolicy: this.rlePolicy
    });

    // Convert to string
    return Buffer.from(sixelBytes).toString('latin1');
  }
}

module.exports = { SixelRenderer };
