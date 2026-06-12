/**
 * Scaler - Image scaling utilities (Browser version)
 */

class Scaler {
  static calculateScaleToFit(imageWidth, imageHeight, maxWidth, maxHeight, options = {}) {
    const cellX = options.cellX || 1;
    const cellY = options.cellY || 2;
    const widthStretch = options.widthStretch || 1.0;
    const upscale = options.upscale || false;

    const maxPixelWidth = maxWidth * cellX;
    const maxPixelHeight = maxHeight * cellY;

    const adjustedWidth = maxPixelWidth / widthStretch;
    const adjustedHeight = maxPixelHeight;

    const scaleX = adjustedWidth / imageWidth;
    const scaleY = adjustedHeight / imageHeight;

    let scale = Math.min(scaleX, scaleY);

    if (!upscale && scale > 1) {
      scale = 1;
    }

    let targetWidth = Math.floor(imageWidth * scale);
    let targetHeight = Math.floor(imageHeight * scale);

    targetWidth = Math.floor(targetWidth / cellX) * cellX;
    targetHeight = Math.floor(targetHeight / cellY) * cellY;

    targetWidth = Math.max(targetWidth, cellX);
    targetHeight = Math.max(targetHeight, cellY);

    return { width: targetWidth, height: targetHeight };
  }

  static calculateHalfBlockSize(imageWidth, imageHeight, maxWidth, maxHeight, options = {}) {
    return Scaler.calculateScaleToFit(imageWidth, imageHeight, maxWidth, maxHeight, {
      ...options,
      cellX: 1,
      cellY: 2
    });
  }

  static calculateQuarterBlockSize(imageWidth, imageHeight, maxWidth, maxHeight, options = {}) {
    return Scaler.calculateScaleToFit(imageWidth, imageHeight, maxWidth, maxHeight, {
      ...options,
      cellX: 2,
      cellY: 2
    });
  }

  static pixelsToCharacters(pixelWidth, pixelHeight, cellX = 1, cellY = 2) {
    return {
      cols: Math.ceil(pixelWidth / cellX),
      rows: Math.ceil(pixelHeight / cellY)
    };
  }

  static resizeNearest(src, targetWidth, targetHeight) {
    const dst = new Framebuffer(targetWidth, targetHeight);
    const scaleX = src.width / targetWidth;
    const scaleY = src.height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.min(Math.floor(x * scaleX), src.width - 1);
        const srcY = Math.min(Math.floor(y * scaleY), src.height - 1);
        dst.setPixel(x, y, src.getPixel(srcX, srcY));
      }
    }

    return dst;
  }

  static resizeBilinear(src, targetWidth, targetHeight) {
    const dst = new Framebuffer(targetWidth, targetHeight);
    const scaleX = (src.width - 1) / (targetWidth - 1);
    const scaleY = (src.height - 1) / (targetHeight - 1);

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = x * scaleX;
        const srcY = y * scaleY;
        
        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = Math.min(x1 + 1, src.width - 1);
        const y2 = Math.min(y1 + 1, src.height - 1);
        
        const xWeight = srcX - x1;
        const yWeight = srcY - y1;
        
        const p1 = src.getPixel(x1, y1);
        const p2 = src.getPixel(x2, y1);
        const p3 = src.getPixel(x1, y2);
        const p4 = src.getPixel(x2, y2);
        
        const pixel = {
          r: Math.round(
            p1.r * (1 - xWeight) * (1 - yWeight) +
            p2.r * xWeight * (1 - yWeight) +
            p3.r * (1 - xWeight) * yWeight +
            p4.r * xWeight * yWeight
          ),
          g: Math.round(
            p1.g * (1 - xWeight) * (1 - yWeight) +
            p2.g * xWeight * (1 - yWeight) +
            p3.g * (1 - xWeight) * yWeight +
            p4.g * xWeight * yWeight
          ),
          b: Math.round(
            p1.b * (1 - xWeight) * (1 - yWeight) +
            p2.b * xWeight * (1 - yWeight) +
            p3.b * (1 - xWeight) * yWeight +
            p4.b * xWeight * yWeight
          ),
          a: Math.round(
            p1.a * (1 - xWeight) * (1 - yWeight) +
            p2.a * xWeight * (1 - yWeight) +
            p3.a * (1 - xWeight) * yWeight +
            p4.a * xWeight * yWeight
          )
        };
        
        dst.setPixel(x, y, pixel);
      }
    }

    return dst;
  }
}
