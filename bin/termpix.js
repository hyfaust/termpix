#!/usr/bin/env node

/**
 * TermPix CLI — Terminal image encoder/decoder
 *
 * Supports iTerm2 and Sixel protocols with encryption.
 */

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const {
  ImageLoader, encodeITerm2, isITerm2Supported,
  iTerm2Decoder, encodeSixel, decodeSixel,
  medianCut, pnnQuant, applyBayerDither, applyFloydSteinberg,
  encryptData, decryptData, isEncrypted, generatePassword, Scaler
} = require('../src/index');

const program = new Command();

program
  .name('termpix')
  .description('Terminal image encoder/decoder (iTerm2 & Sixel)')
  .version('0.0.1');

// ============================================================
// Encode command
// ============================================================
program
  .command('encode')
  .description('Encode image to iTerm2 or Sixel sequence')
  .argument('<files...>', 'Image file paths')
  .option('-f, --format <fmt>', 'Output format (iterm2, sixel)', 'iterm2')
  .option('-o, --output <path>', 'Output file or directory')
  .option('--max-width <n>', 'Max width in pixels', '800')
  .option('--max-height <n>', 'Max height in pixels', '600')
  .option('--no-resize', 'Keep original resolution')
  .option('--bg <hex>', 'Background color hex', '000000')
  // Sixel options
  .option('--colors <n>', 'Max colors (2-256)', '256')
  .option('--quantize <algo>', 'Quantize algorithm (median-cut, pnn)', 'median-cut')
  .option('--dither <mode>', 'Dither mode (none, bayer, fs)', 'fs')
  // Encryption
  .option('--encrypt', 'Encrypt output')
  .option('-p, --password <pwd>', 'Password for encryption')
  .option('--gen-password', 'Generate random password')
  .action(async (files, opts) => {
    try {
      let password = opts.password;
      if (opts.genPassword) {
        password = generatePassword(16);
        console.log(`Generated password: ${password}`);
      }
      if (opts.encrypt && !password) {
        console.error('Error: Password required for encryption (use -p or --gen-password)');
        process.exit(1);
      }

      const bgColor = hexToRgb(opts.bg);
      const outputDir = opts.output && files.length > 1 ? path.resolve(opts.output) : null;
      const outputFile = opts.output && files.length === 1 ? path.resolve(opts.output) : null;

      if (outputDir && !fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      for (const file of files) {
        const filePath = path.resolve(file);
        const fb = await ImageLoader.loadFromFile(filePath);
        const startTime = Date.now();

        let data, ext;
        if (opts.format === 'iterm2') {
          const result = await encodeITerm2(fb, {
            maxWidth: parseInt(opts.maxWidth),
            maxHeight: parseInt(opts.maxHeight),
            backgroundColor: bgColor,
            noResize: opts.resize === false
          });
          data = Buffer.from(result.sequence, 'utf-8');
          ext = '.iterm2';
        } else {
          // Sixel
          const target = opts.resize === false
            ? fb
            : (() => {
                const s = Scaler.calculateScaleToFit(fb.width, fb.height, parseInt(opts.maxWidth), parseInt(opts.maxHeight), { cellX: 1, cellY: 1 });
                return Scaler.resizeBilinear(fb, s.width, s.height);
              })();

          const rgba = target.getRawData();
          const w = target.width, h = target.height;
          const maxColors = parseInt(opts.colors);

          let quantResult = opts.quantize === 'pnn'
            ? pnnQuant(rgba, w, h, maxColors)
            : medianCut(rgba, w, h, maxColors);

          let pixels = quantResult.pixels;
          if (opts.dither === 'fs') {
            pixels = applyFloydSteinberg(rgba, pixels, quantResult.palette, w, h);
          } else if (opts.dither === 'bayer') {
            const dithered = applyBayerDither(rgba, w, h, 255.0 / maxColors);
            quantResult = opts.quantize === 'pnn'
              ? pnnQuant(dithered, w, h, maxColors)
              : medianCut(dithered, w, h, maxColors);
            pixels = quantResult.pixels;
          }

          data = Buffer.from(encodeSixel(pixels, quantResult.palette, w, h));
          ext = '.sixel';
        }

        if (opts.encrypt) {
          data = encryptData(data, password);
          ext += '.enc';
        }

        const elapsed = Date.now();
        const baseName = path.basename(file, path.extname(file));

        if (outputDir) {
          const outPath = path.join(outputDir, baseName + ext);
          fs.writeFileSync(outPath, data);
          console.log(`${file} -> ${outPath} (${data.length} bytes)`);
        } else if (outputFile) {
          fs.writeFileSync(outputFile, data);
          console.log(`${file} -> ${outputFile} (${data.length} bytes)`);
        } else {
          if (opts.format === 'iterm2' && !opts.encrypt) {
            process.stdout.write(data.toString('utf-8') + '\n');
          } else {
            process.stdout.write(data);
          }
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ============================================================
// Decode command
// ============================================================
program
  .command('decode')
  .description('Decode iTerm2 or Sixel sequence to image')
  .argument('<files...>', 'Sequence file paths')
  .option('-o, --output <path>', 'Output file or directory')
  .option('-f, --format <fmt>', 'Input format (auto, iterm2, sixel)', 'auto')
  .option('--decrypt', 'Decrypt input')
  .option('-p, --password <pwd>', 'Password for decryption')
  .action(async (files, opts) => {
    try {
      const sharp = require('sharp');
      const outputDir = opts.output && files.length > 1 ? path.resolve(opts.output) : null;
      const outputFile = opts.output && files.length === 1 ? path.resolve(opts.output) : null;

      if (outputDir && !fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      for (const file of files) {
        const filePath = path.resolve(file);
        let data = fs.readFileSync(filePath);

        // Decrypt if needed
        if (opts.decrypt || isEncrypted(data)) {
          if (!opts.password) {
            console.error('Error: Password required for decryption (use -p)');
            process.exit(1);
          }
          data = decryptData(data, opts.password);
        }

        const text = data.toString('utf-8');
        let format = opts.format;

        // Auto detect
        if (format === 'auto') {
          if (text.includes('\x1b]1337;File=') || text.includes('\\x1b]1337;File=')) {
            format = 'iterm2';
          } else if (text.includes('\x1bP') || text.includes('\x90')) {
            format = 'sixel';
          } else {
            console.error(`Error: Cannot detect format for ${file}`);
            continue;
          }
        }

        let pngData;
        const startTime = Date.now();

        if (format === 'iterm2') {
          // Unescape if needed
          const unescaped = text.replace(/\\x1b/g, '\x1b').replace(/\\x07/g, '\x07');
          const decoded = await iTerm2Decoder.decodeToPNG(unescaped);
          pngData = decoded;
        } else {
          const result = decodeSixel(text);
          pngData = await sharp(Buffer.from(result.pixels), {
            raw: { width: result.width, height: result.height, channels: 4 }
          }).png().toBuffer();
        }

        const elapsed = Date.now() - startTime;
        const baseName = path.basename(file, path.extname(file));
        const outPath = outputFile || (outputDir ? path.join(outputDir, baseName + '.png') : null);

        if (outPath) {
          fs.writeFileSync(outPath, pngData);
          console.log(`${file} -> ${outPath} (${elapsed}ms)`);
        } else {
          process.stdout.write(pngData);
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

// ============================================================
// Gen password command
// ============================================================
program
  .command('gen-password')
  .description('Generate a random password')
  .option('-l, --length <n>', 'Password length', '16')
  .action((opts) => {
    console.log(generatePassword(parseInt(opts.length)));
  });

// ============================================================
// Helpers
// ============================================================
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

program.parse();
