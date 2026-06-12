const { iTerm2Renderer } = require('../src/renderer/iterm2');
const { ImageLoader } = require('../src/image-loader');

async function test() {
  try {
    console.log('Loading image...');
    const fb = await ImageLoader.loadFromFile('test/test-image.png');
    console.log('Image loaded:', fb.width, 'x', fb.height);
    
    const renderer = new iTerm2Renderer({
      maxWidth: 40,
      maxHeight: 20,
      backgroundColor: { r: 0, g: 0, b: 0 }
    });
    
    console.log('Rendering...');
    const output = await renderer.render(fb);
    console.log('Output length:', output.length);
    console.log('First 200 chars:', output.substring(0, 200));
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

test();
