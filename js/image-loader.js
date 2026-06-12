/**
 * ImageLoader - Load images in browser (Browser version)
 */

class ImageLoader {
  static async loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        ImageLoader.loadFromDataURL(e.target.result)
          .then(resolve)
          .catch(reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static async loadFromDataURL(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(Framebuffer.fromImageData(imageData));
      };
      img.onerror = reject;
      img.src = dataURL;
    });
  }

  static async loadFromURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(Framebuffer.fromImageData(imageData));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  static async loadFromCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return Framebuffer.fromImageData(imageData);
  }

  static async loadFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const dataURL = URL.createObjectURL(blob);
            return await ImageLoader.loadFromDataURL(dataURL);
          }
        }
      }
      throw new Error('No image found in clipboard');
    } catch (error) {
      throw new Error(`Failed to read clipboard: ${error.message}`);
    }
  }

  static async getMetadata(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
      };
      img.onerror = reject;
      
      if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.readAsDataURL(source);
      } else {
        img.src = source;
      }
    });
  }
}
