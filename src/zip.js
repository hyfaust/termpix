/**
 * zip.js — Minimal ZIP file reader/writer
 *
 * Store mode (no compression) writer + Store/Deflate reader.
 * Zero external dependencies. Supports UTF-8 filenames.
 *
 * Ported from sixel-web project.
 */

'use strict';

const { createDeflateRaw, createInflateRaw } = require('zlib');

// CRC32 lookup table
const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crc32Table[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crc32Table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Create a ZIP file from multiple files
 * @param {Array<{name: string, data: Buffer}>} files
 * @returns {Buffer} ZIP file data
 */
function createZip(files) {
  const entries = [];
  let offset = 0;

  // Local file headers + data
  const parts = [];
  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf-8');
    const data = file.data;
    const crc = crc32(data);

    // Local file header
    const header = Buffer.alloc(30 + nameBuf.length);
    header.writeUInt32LE(0x04034B50, 0);  // Signature
    header.writeUInt16LE(20, 4);           // Version needed
    header.writeUInt16LE(0, 6);            // Flags
    header.writeUInt16LE(0, 8);            // Compression (Store)
    header.writeUInt16LE(0, 10);           // Mod time
    header.writeUInt16LE(0, 12);           // Mod date
    header.writeUInt32LE(crc, 14);         // CRC32
    header.writeUInt32LE(data.length, 18); // Compressed size
    header.writeUInt32LE(data.length, 22); // Uncompressed size
    header.writeUInt16LE(nameBuf.length, 26); // Filename length
    header.writeUInt16LE(0, 28);           // Extra field length
    nameBuf.copy(header, 30);

    entries.push({
      name: nameBuf,
      crc,
      size: data.length,
      offset
    });

    parts.push(header, data);
    offset += header.length + data.length;
  }

  // Central directory
  const centralParts = [];
  let centralSize = 0;
  for (const entry of entries) {
    const rec = Buffer.alloc(46 + entry.name.length);
    rec.writeUInt32LE(0x02014B50, 0);     // Signature
    rec.writeUInt16LE(20, 4);              // Version made by
    rec.writeUInt16LE(20, 6);              // Version needed
    rec.writeUInt16LE(0, 8);               // Flags
    rec.writeUInt16LE(0, 10);              // Compression (Store)
    rec.writeUInt16LE(0, 12);              // Mod time
    rec.writeUInt16LE(0, 14);              // Mod date
    rec.writeUInt32LE(entry.crc, 16);      // CRC32
    rec.writeUInt32LE(entry.size, 20);     // Compressed size
    rec.writeUInt32LE(entry.size, 24);     // Uncompressed size
    rec.writeUInt16LE(entry.name.length, 28); // Filename length
    rec.writeUInt16LE(0, 30);              // Extra field length
    rec.writeUInt16LE(0, 32);              // Comment length
    rec.writeUInt16LE(0, 34);              // Disk number start
    rec.writeUInt16LE(0, 36);              // Internal attributes
    rec.writeUInt32LE(0, 38);              // External attributes
    rec.writeUInt32LE(entry.offset, 42);   // Local header offset
    entry.name.copy(rec, 46);
    centralParts.push(rec);
    centralSize += rec.length;
  }

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054B50, 0);       // Signature
  eocd.writeUInt16LE(0, 4);                // Disk number
  eocd.writeUInt16LE(0, 6);                // Central dir disk
  eocd.writeUInt16LE(entries.length, 8);   // Entries on disk
  eocd.writeUInt16LE(entries.length, 10);  // Total entries
  eocd.writeUInt32LE(centralSize, 12);     // Central dir size
  eocd.writeUInt32LE(offset, 16);          // Central dir offset
  eocd.writeUInt16LE(0, 20);               // Comment length

  return Buffer.concat([...parts, ...centralParts, eocd]);
}

/**
 * Read a ZIP file and extract entries
 * @param {Buffer} zipData - ZIP file data
 * @returns {Array<{name: string, data: Buffer}>} Extracted files
 */
function readZip(zipData) {
  const results = [];

  // Find end of central directory
  let eocdOffset = -1;
  for (let i = zipData.length - 22; i >= 0; i--) {
    if (zipData.readUInt32LE(i) === 0x06054B50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error('Invalid ZIP file');

  const centralDirOffset = zipData.readUInt32LE(eocdOffset + 16);
  const numEntries = zipData.readUInt16LE(eocdOffset + 10);

  let pos = centralDirOffset;
  for (let i = 0; i < numEntries; i++) {
    if (zipData.readUInt32LE(pos) !== 0x02014B50) {
      throw new Error('Invalid central directory entry');
    }

    const compression = zipData.readUInt16LE(pos + 10);
    const compSize = zipData.readUInt32LE(pos + 20);
    const uncompSize = zipData.readUInt32LE(pos + 24);
    const nameLen = zipData.readUInt16LE(pos + 28);
    const extraLen = zipData.readUInt16LE(pos + 30);
    const localOffset = zipData.readUInt32LE(pos + 42);
    const name = zipData.slice(pos + 46, pos + 46 + nameLen).toString('utf-8');

    // Read local file header to get data offset
    const dataOffset = localOffset + 30 + nameLen + zipData.readUInt16LE(localOffset + 28);
    const fileData = zipData.slice(dataOffset, dataOffset + compSize);

    if (compression === 0) {
      // Store mode
      results.push({ name, data: Buffer.from(fileData) });
    } else if (compression === 8) {
      // Deflate
      const inflated = require('zlib').inflateRawSync(fileData);
      results.push({ name, data: inflated });
    } else {
      throw new Error(`Unsupported compression method: ${compression}`);
    }

    pos += 46 + nameLen + extraLen + zipData.readUInt16LE(pos + 32);
  }

  return results;
}

module.exports = { createZip, readZip };
