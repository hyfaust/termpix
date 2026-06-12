/**
 * Framebuffer - Pixel data structure for image rendering (Browser version)
 */

class Framebuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  getPixel(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    const offset = (y * this.width + x) * 4;
    return {
      r: this.data[offset],
      g: this.data[offset + 1],
      b: this.data[offset + 2],
      a: this.data[offset + 3]
    };
  }

  setPixel(x, y, pixel) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    const offset = (y * this.width + x) * 4;
    this.data[offset] = pixel.r;
    this.data[offset + 1] = pixel.g;
    this.data[offset + 2] = pixel.b;
    this.data[offset + 3] = pixel.a;
  }

  clear(color = { r: 0, g: 0, b: 0, a: 0 }) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = color.r;
      this.data[i + 1] = color.g;
      this.data[i + 2] = color.b;
      this.data[i + 3] = color.a;
    }
  }

  getRawData() {
    return this.data;
  }

  static fromRawData(width, height, data) {
    const fb = new Framebuffer(width, height);
    fb.data.set(data);
    return fb;
  }

  static fromImageData(imageData) {
    return Framebuffer.fromRawData(imageData.width, imageData.height, imageData.data);
  }

  static isTransparent(pixel) {
    return pixel.a === 0;
  }

  static isOpaque(pixel) {
    return pixel.a === 255;
  }

  static pixelsEqual(a, b) {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  }

  static alphaCompose(pixel, bg) {
    if (pixel.a === 255) return pixel;
    if (pixel.a === 0) return bg;

    const alpha = pixel.a / 255;
    const invAlpha = 1 - alpha;

    return {
      r: Math.round(pixel.r * alpha + bg.r * invAlpha),
      g: Math.round(pixel.g * alpha + bg.g * invAlpha),
      b: Math.round(pixel.b * alpha + bg.b * invAlpha),
      a: 255
    };
  }

  alphaComposeBackground(bgColor, checkerboard = false) {
    const checkerLight = { r: 153, g: 153, b: 153, a: 255 };
    const checkerDark = { r: 102, g: 102, b: 102, a: 255 };
    const checkerSize = 8;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pixel = this.getPixel(x, y);
        if (pixel.a < 255) {
          let bg = bgColor;
          if (checkerboard) {
            const checkerX = Math.floor(x / checkerSize);
            const checkerY = Math.floor(y / checkerSize);
            bg = (checkerX + checkerY) % 2 === 0 ? checkerLight : checkerDark;
          }
          this.setPixel(x, y, Framebuffer.alphaCompose(pixel, bg));
        }
      }
    }
  }

  clone() {
    const fb = new Framebuffer(this.width, this.height);
    fb.data.set(this.data);
    return fb;
  }

  toCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(this.data, this.width, this.height);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }
}
