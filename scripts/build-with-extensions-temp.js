#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const extensionsDir = path.join(rootDir, 'extensions');
const renamedExtensionsDir = path.join(rootDir, 'extensions.bak');

function build() {
  let extensionsRenamed = false;

  try {
    // Check if extensions directory exists
    if (fs.existsSync(extensionsDir)) {
      console.log('📦 Renaming extensions folder temporarily...');

      // Remove old backup if exists
      if (fs.existsSync(renamedExtensionsDir)) {
        console.log('🗑️  Removing old extensions.bak...');
        try {
          execSync(`rmdir /s /q "${renamedExtensionsDir}"`, { stdio: 'ignore' });
        } catch (e) {
          // Ignore error if already deleted
        }
      }

      // Use Windows ren command which handles file locks better
      execSync(`ren "${extensionsDir}" "extensions.bak"`, { cwd: rootDir });
      extensionsRenamed = true;
      console.log('✅ Extensions renamed to extensions.bak');
    } else {
      console.log('ℹ️  No extensions folder found, proceeding with build');
    }

    // Run the Next.js build
    console.log('🏗️  Building Next.js application...');
    execSync('next build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  } finally {
    // Always restore extensions if they were renamed
    if (extensionsRenamed) {
      try {
        console.log('📦 Restoring extensions folder...');
        execSync(`ren "${renamedExtensionsDir}" "extensions"`, { cwd: rootDir });
        console.log('✅ Extensions folder restored');
      } catch (restoreError) {
        console.error('❌ Failed to restore extensions folder:', restoreError.message);
        console.error('⚠️  Extensions are in: extensions.bak');
        console.error('⚠️  Please manually rename it back to: extensions');
        process.exit(1);
      }
    }
  }
}

build();
