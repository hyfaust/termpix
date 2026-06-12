/**
 * Test script for iTerm2-cli
 * 
 * This script creates a simple test image and renders it using different renderers.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { renderImage, getAvailableRenderers, iTerm2Decoder } = require('../src/index');
const { Terminal } = require('../src/terminal');

async function createTestImage() {
  // Create a simple test image with gradient
  const width = 100;
  const height = 100;
  const channels = 4; // RGBA
  
  const data = Buffer.alloc(width * height * channels);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      data[offset] = Math.round(x / width * 255);     // R
      data[offset + 1] = Math.round(y / height * 255); // G
      data[offset + 2] = 128;                          // B
      data[offset + 3] = 255;                          // A
    }
  }
  
  const testImagePath = path.join(__dirname, 'test-image.png');
  
  await sharp(data, {
    raw: {
      width,
      height,
      channels
    }
  })
    .png()
    .toFile(testImagePath);
  
  return testImagePath;
}

async function testRenderer(rendererName, imagePath) {
  console.log(`\n=== Testing ${rendererName} renderer ===`);
  
  try {
    const output = await renderImage(imagePath, {
      renderer: rendererName,
      maxWidth: 40,
      maxHeight: 20,
      backgroundColor: { r: 0, g: 0, b: 0 }
    });
    
    Terminal.write(output + '\n');
    console.log(`✓ ${rendererName} renderer works`);
  } catch (error) {
    console.error(`✗ ${rendererName} renderer failed: ${error.message}`);
  }
}

async function testDecoder(testImagePath) {
  console.log('\n=== Testing iTerm2 decoder ===');
  
  try {
    // First, encode an image to iTerm2 format
    const encoded = await renderImage(testImagePath, {
      renderer: 'iterm2',
      maxWidth: 40,
      maxHeight: 20,
      backgroundColor: { r: 0, g: 0, b: 0 }
    });
    
    console.log(`Encoded sequence length: ${encoded.length}`);
    
    // Test containsITerm2
    const contains = iTerm2Decoder.containsITerm2(encoded);
    console.log(`✓ containsITerm2: ${contains}`);
    
    // Test decodeSequence
    const parsed = iTerm2Decoder.decodeSequence(encoded);
    console.log(`✓ decodeSequence: size=${parsed.size}, width=${parsed.width}, height=${parsed.height}`);
    
    // Test findAll
    const all = iTerm2Decoder.findAll(encoded);
    console.log(`✓ findAll: found ${all.length} sequence(s)`);
    
    // Test getMetadata
    const metadata = await iTerm2Decoder.getMetadata(encoded);
    console.log(`✓ getMetadata: format=${metadata.image.format}, ${metadata.image.width}x${metadata.image.height}`);
    
    // Test decodeToFramebuffer
    const fb = await iTerm2Decoder.decodeToFramebuffer(encoded);
    console.log(`✓ decodeToFramebuffer: ${fb.width}x${fb.height}`);
    
    // Test decodeToPNG
    const png = await iTerm2Decoder.decodeToPNG(encoded);
    console.log(`✓ decodeToPNG: ${png.length} bytes`);
    
    // Test decodeToJPEG
    const jpeg = await iTerm2Decoder.decodeToJPEG(encoded, 90);
    console.log(`✓ decodeToJPEG: ${jpeg.length} bytes`);
    
    // Test stripSequences
    const textWithImage = 'Hello\x1b]1337;File=size=100;inline=1:AA==\x07World';
    const stripped = iTerm2Decoder.stripSequences(textWithImage);
    console.log(`✓ stripSequences: "${stripped}"`);
    
    // Test replaceSequences
    const replaced = iTerm2Decoder.replaceSequences(textWithImage, '[IMG]');
    console.log(`✓ replaceSequences: "${replaced}"`);
    
    // Save decoded PNG for verification
    const outputPath = path.join(__dirname, 'decoded-test.png');
    fs.writeFileSync(outputPath, png);
    console.log(`✓ Decoded PNG saved to: ${outputPath}`);
    
    console.log('✓ All decoder tests passed');
  } catch (error) {
    console.error(`✗ Decoder test failed: ${error.message}`);
    console.error(error.stack);
  }
}

async function main() {
  console.log('Creating test image...');
  const testImagePath = await createTestImage();
  console.log(`Test image created: ${testImagePath}`);
  
  console.log('\nAvailable renderers:', getAvailableRenderers().join(', '));
  
  // Test each renderer
  await testRenderer('half', testImagePath);
  await testRenderer('quarter', testImagePath);
  
  // iTerm2 renderer requires async render
  console.log('\n=== Testing iterm2 renderer ===');
  try {
    const output = await renderImage(testImagePath, {
      renderer: 'iterm2',
      maxWidth: 40,
      maxHeight: 20,
      backgroundColor: { r: 0, g: 0, b: 0 }
    });
    
    // Don't print the escape sequence, just confirm it works
    console.log(`✓ iterm2 renderer works (output length: ${output.length})`);
  } catch (error) {
    console.error(`✗ iterm2 renderer failed: ${error.message}`);
  }
  
  // Test decoder
  await testDecoder(testImagePath);
  
  console.log('\nAll tests completed!');
}

main().catch(console.error);
