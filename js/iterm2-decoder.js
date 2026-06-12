/**
 * iTerm2Decoder - Decode iTerm2 inline image protocol (Browser version)
 */

class iTerm2Decoder {
  static SINGLE_PATTERN = /\x1b\]1337;File=([^\x07\x1b]*?):([A-Za-z0-9+/=]+)(?:\x07|\x1b\\)/;

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

  static parseDimension(value) {
    if (!value) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

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
      name: params.name ? atob(params.name) : null,
      base64: base64Data,
      data: iTerm2Decoder.base64ToUint8Array(base64Data)
    };
  }

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
        name: params.name ? atob(params.name) : null,
        base64: base64Data,
        data: iTerm2Decoder.base64ToUint8Array(base64Data),
        sequence: match[0],
        index: match.index
      });
    }
    
    return results;
  }

  static base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  static uint8ArrayToBase64(uint8Array) {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  static async decodeToImageBitmap(sequence) {
    const parsed = iTerm2Decoder.decodeSequence(sequence);
    if (!parsed) {
      throw new Error('Invalid iTerm2 escape sequence');
    }

    const blob = new Blob([parsed.data]);
    return await createImageBitmap(blob);
  }

  static async decodeToCanvas(sequence) {
    const imageBitmap = await iTerm2Decoder.decodeToImageBitmap(sequence);
    
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);
    
    return canvas;
  }

  static async decodeToFramebuffer(sequence) {
    const canvas = await iTerm2Decoder.decodeToCanvas(sequence);
    return ImageLoader.loadFromCanvas(canvas);
  }

  static async decodeToDataURL(sequence, format = 'image/png') {
    const canvas = await iTerm2Decoder.decodeToCanvas(sequence);
    return canvas.toDataURL(format);
  }

  static async decodeToBlob(sequence, format = 'image/png', quality = 0.9) {
    const canvas = await iTerm2Decoder.decodeToCanvas(sequence);
    
    return new Promise((resolve) => {
      canvas.toBlob(resolve, format, quality);
    });
  }

  static async getMetadata(sequence) {
    const parsed = iTerm2Decoder.decodeSequence(sequence);
    if (!parsed) {
      throw new Error('Invalid iTerm2 escape sequence');
    }

    const imageBitmap = await createImageBitmap(new Blob([parsed.data]));

    return {
      protocol: {
        size: parsed.size,
        width: parsed.width,
        height: parsed.height,
        inline: parsed.inline,
        name: parsed.name
      },
      image: {
        width: imageBitmap.width,
        height: imageBitmap.height
      }
    };
  }

  static containsITerm2(text) {
    return /\x1b\]1337;File=/.test(text);
  }

  static stripSequences(text) {
    return text.replace(/\x1b\]1337;File=[^\x07\x1b]*?(?:\x07|\x1b\\)/g, '');
  }

  static replaceSequences(text, placeholder = '[IMAGE]') {
    return text.replace(/\x1b\]1337;File=[^\x07\x1b]*?(?:\x07|\x1b\\)/g, placeholder);
  }

  static escapeSequence(sequence) {
    return sequence
      .replace(/\x1b/g, '\\x1b')
      .replace(/\x07/g, '\\x07');
  }

  static unescapeSequence(escaped) {
    return escaped
      .replace(/\\x1b/g, '\x1b')
      .replace(/\\x07/g, '\x07')
      .replace(/\\e/g, '\x1b');
  }
}
