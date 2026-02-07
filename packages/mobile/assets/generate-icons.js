// Generate minimal valid PNG icons for Expo prebuild
const fs = require('fs');
const path = require('path');

// Minimal 1024x1024 solid color PNG (base64 encoded)
// This is a tiny valid PNG that Jimp can process
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Write icons
const assetsDir = __dirname;
fs.writeFileSync(path.join(assetsDir, 'icon.png'), minimalPNG);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), minimalPNG);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), minimalPNG);

console.log('✓ Generated minimal PNG icons');
