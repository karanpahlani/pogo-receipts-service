#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readGitignore(): string[] {
  const gitignorePath = path.join(__dirname, '..', '..', '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    console.warn('No .gitignore file found, including all files');
    return [];
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#')); // Remove empty lines and comments
}

function buildFindCommand(ignorePatterns: string[]): string {
  let findCmd = 'find . -type f';

  for (const pattern of ignorePatterns) {
    if (pattern.endsWith('/')) {
      // Directory pattern
      const dirPattern = pattern.slice(0, -1);
      findCmd += ` -not -path './${dirPattern}/*'`;
    } else if (pattern.includes('/')) {
      // Path pattern
      findCmd += ` -not -path './${pattern}'`;
    } else if (pattern.includes('*')) {
      // Glob pattern
      findCmd += ` -not -name '${pattern}'`;
    } else {
      // Simple file/directory name
      findCmd += ` -not -name '${pattern}' -not -path './*/${pattern}/*'`;
    }
  }

  return findCmd;
}

function createZip() {
  const projectName = 'pogo-data-ingestion-take-home';
  const zipFileName = `${projectName}.zip`;

  console.log('Reading .gitignore patterns...');
  const ignorePatterns = readGitignore();
  console.log(`Found ${ignorePatterns.length} ignore patterns`);
  console.log('Ignore patterns:', ignorePatterns);

  console.log('Building file list...');
  const findCmd = buildFindCommand(ignorePatterns);
  console.log('Find command:', findCmd);

  // Remove existing zip file if it exists
  if (fs.existsSync(zipFileName)) {
    console.log('Removing existing zip file...');
    fs.unlinkSync(zipFileName);
  }

  console.log('Creating optimized zip file...');
  // Use maximum compression (-9) and exclude extra file attributes (-X)
  // -9: maximum compression
  // -X: exclude extra file attributes (for better cross-platform compatibility)
  // -v: verbose mode (shows files being added)
  const zipCmd = `${findCmd} | zip -9 -v -X -@ ${zipFileName}`;

  const startTime = Date.now();

  try {
    execSync(zipCmd, { stdio: 'inherit' });

    const endTime = Date.now();
    const stats = fs.statSync(zipFileName);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const compressionTime = ((endTime - startTime) / 1000).toFixed(1);

    console.log(`✅ Created ${zipFileName}`);
    console.log(`📦 File size: ${fileSizeMB} MB`);
    console.log(`⏱️  Compression time: ${compressionTime}s`);
    console.log(`🎯 Ready for submission!`);
  } catch (error) {
    console.error('❌ Failed to create zip file:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createZip();
}
