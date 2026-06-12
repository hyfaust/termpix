/**
 * crypto.js — Sixel Data Encryption/Decryption
 *
 * AES-256-GCM + PBKDF2 authenticated encryption.
 * File format: Magic("SXL1") + Salt(16B) + IV(12B) + Ciphertext + AuthTag(16B)
 *
 * Ported from sixel-web project. Adapted for Node.js crypto API.
 */

'use strict';

const crypto = require('crypto');

const MAGIC = Buffer.from([0x53, 0x58, 0x4C, 0x31]); // "SXL1"
const SALT_LEN = 16;
const IV_LEN = 12;
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN; // 32 bytes
const PBKDF2_ITERATIONS = 100000;

/**
 * Derive AES-256 key from password using PBKDF2
 * @param {string} password
 * @param {Buffer} salt
 * @returns {Buffer} Derived key
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
}

/**
 * Encrypt Sixel data
 * @param {Buffer|Uint8Array} sixelData - Raw Sixel bytes
 * @param {string} password - User password
 * @returns {Buffer} Encrypted data with header
 */
function encryptSixel(sixelData, password) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(sixelData), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const result = Buffer.alloc(HEADER_LEN + encrypted.length + authTag.length);
  MAGIC.copy(result, 0);
  salt.copy(result, MAGIC.length);
  iv.copy(result, MAGIC.length + SALT_LEN);
  encrypted.copy(result, HEADER_LEN);
  authTag.copy(result, HEADER_LEN + encrypted.length);

  return result;
}

/**
 * Decrypt Sixel data
 * @param {Buffer|Uint8Array} encryptedData - Encrypted data with header
 * @param {string} password - User password
 * @returns {Buffer} Decrypted Sixel bytes
 */
function decryptSixel(encryptedData, password) {
  const data = Buffer.from(encryptedData);

  if (data.length < HEADER_LEN + 16) {
    throw new Error('File too small, not a valid encrypted Sixel file');
  }

  // Verify magic number
  for (let i = 0; i < MAGIC.length; i++) {
    if (data[i] !== MAGIC[i]) {
      throw new Error('Not an encrypted Sixel file');
    }
  }

  const salt = data.slice(MAGIC.length, MAGIC.length + SALT_LEN);
  const iv = data.slice(MAGIC.length + SALT_LEN, HEADER_LEN);
  const authTag = data.slice(data.length - 16);
  const ciphertext = data.slice(HEADER_LEN, data.length - 16);

  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Check if data is encrypted Sixel file
 * @param {Buffer|Uint8Array} data - First few bytes of file
 * @returns {boolean}
 */
function isEncrypted(data) {
  if (data.length < MAGIC.length) return false;
  for (let i = 0; i < MAGIC.length; i++) {
    if (data[i] !== MAGIC[i]) return false;
  }
  return true;
}

/**
 * Generate a random password
 * @param {number} length - Password length (default 16)
 * @returns {string} Random password
 */
function generatePassword(length) {
  length = length || 16;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

module.exports = {
  encryptData: encryptSixel,
  decryptData: decryptSixel,
  encryptSixel: encryptSixel,
  decryptSixel: decryptSixel,
  isEncrypted: isEncrypted,
  generatePassword: generatePassword
};
