const { iTerm2Renderer } = require('../src/renderer/iterm2');
const { ImageLoader } = require('../src/image-loader');
const fs = require('fs');

async function createTestSequence() {
  try {
    console.log('Loading image...');
    const fb = await ImageLoader.loadFromFile('test/test-image.png');
    console.log('Image loaded:', fb.width, 'x', fb.height);
    
    const renderer = new iTerm2Renderer({
      maxWidth: 40,
      maxHeight: 20,
      backgroundColor: { r: 0, g: 0, b: 0 }
    });
    
    console.log('Encoding to iTerm2 sequence...');
    const sequence = await renderer.render(fb);
    console.log('Sequence length:', sequence.length);
    
    // Save to file
    const outputPath = 'test/test-sequence.txt';
    fs.writeFileSync(outputPath, sequence, 'utf-8');
    console.log('Saved to:', outputPath);
    
    return sequence;
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

createTestSequence();
