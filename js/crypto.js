/**
 * crypto.js — Browser-compatible encryption/decryption
 *
 * AES-256-GCM + PBKDF2 using Web Crypto API.
 * File format: Magic("SXL1") + Salt(16B) + IV(12B) + Ciphertext + AuthTag(16B)
 */

(function () {
  'use strict';

  var MAGIC = new Uint8Array([0x53, 0x58, 0x4C, 0x31]); // "SXL1"
  var SALT_LEN = 16;
  var IV_LEN = 12;
  var HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN;
  var PBKDF2_ITERATIONS = 100000;

  async function deriveKey(password, salt) {
    var encoder = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptData(data, password) {
    var salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    var iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    var key = await deriveKey(password, salt);

    var encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    var encBytes = new Uint8Array(encrypted);
    var result = new Uint8Array(HEADER_LEN + encBytes.length);
    result.set(MAGIC, 0);
    result.set(salt, MAGIC.length);
    result.set(iv, MAGIC.length + SALT_LEN);
    result.set(encBytes, HEADER_LEN);
    return result;
  }

  async function decryptData(encryptedData, password) {
    if (encryptedData.length < HEADER_LEN + 16) {
      throw new Error('文件过小，不是有效的加密文件');
    }
    for (var i = 0; i < MAGIC.length; i++) {
      if (encryptedData[i] !== MAGIC[i]) {
        throw new Error('不是加密文件');
      }
    }

    var salt = encryptedData.slice(MAGIC.length, MAGIC.length + SALT_LEN);
    var iv = encryptedData.slice(MAGIC.length + SALT_LEN, HEADER_LEN);
    var ciphertext = encryptedData.slice(HEADER_LEN);

    var key = await deriveKey(password, salt);
    var decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    return new Uint8Array(decrypted);
  }

  function isEncrypted(data) {
    if (data.length < MAGIC.length) return false;
    for (var i = 0; i < MAGIC.length; i++) {
      if (data[i] !== MAGIC[i]) return false;
    }
    return true;
  }

  function generatePassword(length) {
    length = length || 16;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    var array = crypto.getRandomValues(new Uint8Array(length));
    var result = '';
    for (var i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  window.SixelCrypto = {
    encryptData: encryptData,
    decryptData: decryptData,
    isEncrypted: isEncrypted,
    generatePassword: generatePassword
  };
})();
