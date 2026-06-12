/**
 * iTerm2-cli - Terminal image encoder/decoder
 *
 * Supports iTerm2 and Sixel protocols.
 */

'use strict';

const { Framebuffer } = require('./framebuffer');
const { ImageLoader } = require('./image-loader');
const { Scaler } = require('./scaler');
const { encodeITerm2, isITerm2Supported } = require('./iterm2-encoder');
const { iTerm2Decoder } = require('./iterm2-decoder');
const { encodeSixel } = require('./sixel-encoder');
const { decodeSixel } = require('./sixel-decoder');
const { medianCut, pnnQuant } = require('./quantize');
const { applyBayerDither, applyFloydSteinberg } = require('./dither');
const { encryptData, decryptData, isEncrypted, generatePassword } = require('./crypto');

module.exports = {
  Framebuffer,
  ImageLoader,
  Scaler,
  encodeITerm2,
  isITerm2Supported,
  iTerm2Decoder,
  encodeSixel,
  decodeSixel,
  medianCut,
  pnnQuant,
  applyBayerDither,
  applyFloydSteinberg,
  encryptData,
  decryptData,
  isEncrypted,
  generatePassword
};
