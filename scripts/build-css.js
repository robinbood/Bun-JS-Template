const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the output directory exists
const outputDir = path.join(__dirname, '../dist');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Process Tailwind CSS
console.log('Processing Tailwind CSS...');
try {
  execSync('npx tailwindcss -i ./src/index.css -o ./dist/styles.css --watch', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('Tailwind CSS processed successfully!');
} catch (error) {
  console.error('Error processing Tailwind CSS:', error);
  process.exit(1);
}