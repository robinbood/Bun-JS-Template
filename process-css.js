import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Processing Tailwind CSS...');
try {
  execSync('npx tailwindcss -i ./src/index.css -o ./src/index-processed.css', {
    stdio: 'inherit',
    cwd: path.join(process.cwd())
  });
  console.log('Tailwind CSS processed successfully!');
} catch (error) {
  console.error('Error processing Tailwind CSS:', error);
  process.exit(1);
}