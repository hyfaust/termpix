# TermPix

[English](README.md) | [简体中文](README_zh.md)

---

[![GitHub License](https://img.shields.io/badge/license-GPL%20v3-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.0.1-green.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

> Terminal image encoder/decoder supporting iTerm2 and Sixel protocols.

**⚠️ Disclaimer: This project's code and documentation are AI-generated and provided for reference only. Please verify before use.**

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Encode](#encode)
  - [Decode](#decode)
  - [Generate Password](#generate-password)
- [Project Structure](#project-structure)
- [Supported Protocols](#supported-protocols)
- [License](#license)

## Features

- **Two protocols**: iTerm2 and Sixel encoding/decoding
- **Batch processing**: Encode/decode multiple files at once
- **Encryption**: AES-256-GCM encryption with PBKDF2 key derivation
- **Random password generation**: Built-in secure password generator
- **Timing display**: Shows elapsed time for encode/decode operations
- **Multiple quantization algorithms**: Median Cut and PNN (Pairwise Nearest Neighbor)
- **Dithering support**: Floyd-Steinberg and Bayer ordered dithering

## Prerequisites

| Dependency | Version | Required |
|------------|---------|----------|
| Node.js    | >= 18   | Yes      |

## Installation

```bash
# Clone the repository
git clone -b main https://github.com/hyfaust/termpix.git
cd termpix

# Install dependencies
npm install

# (Optional) Link globally
npm link
```

## Usage

### Encode

```bash
# Encode to iTerm2 format
termpix encode -f iterm2 image.png

# Encode to Sixel format
termpix encode -f sixel image.png

# Encode with encryption
termpix encode -f iterm2 --encrypt -p mypassword image.png

# Encode with auto-generated password
termpix encode -f iterm2 --encrypt --gen-password image.png

# Batch encode multiple files
termpix encode -f iterm2 -o output/ *.png

# Keep original resolution (no resize)
termpix encode -f iterm2 --no-resize image.png

# Sixel options: colors, quantization, dithering
termpix encode -f sixel --colors 128 --quantize pnn --dither fs image.png
```

#### Encode Options

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <fmt>` | Output format: `iterm2` or `sixel` | `iterm2` |
| `-o, --output <path>` | Output file or directory | stdout |
| `--max-width <n>` | Max width in pixels | 800 |
| `--max-height <n>` | Max height in pixels | 600 |
| `--no-resize` | Keep original resolution | false |
| `--bg <hex>` | Background color (hex) | `000000` |
| `--colors <n>` | Max palette colors (2-256, Sixel only) | 256 |
| `--quantize <algo>` | Algorithm: `median-cut` or `pnn` | `median-cut` |
| `--dither <mode>` | Mode: `none`, `bayer`, or `fs` | `fs` |
| `--encrypt` | Enable encryption | false |
| `-p, --password <pwd>` | Encryption password | - |
| `--gen-password` | Generate random password | false |

### Decode

```bash
# Auto-detect format and decode
termpix decode sequence.iterm2

# Decode Sixel file
termpix decode -f sixel sixel-data.txt

# Decrypt and decode
termpix decode --decrypt -p mypassword encrypted.enc

# Batch decode multiple files
termpix decode -o output/ *.iterm2 *.sixel

# Save as JPEG
termpix decode -f jpeg -q 90 -o output.jpg sequence.iterm2
```

#### Decode Options

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <fmt>` | Input format: `auto`, `iterm2`, `sixel` | `auto` |
| `-o, --output <path>` | Output file or directory | stdout |
| `--decrypt` | Decrypt input | false |
| `-p, --password <pwd>` | Decryption password | - |

### Generate Password

```bash
# Generate 16-character password (default)
termpix gen-password

# Generate 32-character password
termpix gen-password -l 32
```

## Project Structure

```
termpix-cli/
├── bin/
│   └── termpix.js            # CLI entry point
├── src/
│   ├── index.js              # Module exports
│   ├── framebuffer.js        # Pixel data structure
│   ├── image-loader.js       # Image loading (file/URL)
│   ├── scaler.js             # Image scaling
│   ├── iterm2-encoder.js     # iTerm2 protocol encoder
│   ├── iterm2-decoder.js     # iTerm2 protocol decoder
│   ├── sixel-encoder.js      # Sixel protocol encoder
│   ├── sixel-decoder.js      # Sixel protocol decoder
│   ├── quantize.js           # Color quantization (Median Cut, PNN)
│   ├── dither.js             # Dithering (Floyd-Steinberg, Bayer)
│   ├── crypto.js             # AES-256-GCM encryption
│   └── zip.js                # ZIP file handling
├── test/                     # Test files
├── package.json
└── LICENSE
```

## Supported Protocols

### iTerm2

Inline image protocol for terminals like iTerm2, WezTerm, VS Code, Warp, mintty, rio.

```
ESC ] 1337 ; File = size=N ; width=Wpx ; height=Hpx ; inline=1 : BASE64_DATA BEL
```

### Sixel

DEC Sixel Graphics Protocol supported by most modern terminals.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

---

**Note**: This project's code and documentation are AI-generated and provided for reference only.
