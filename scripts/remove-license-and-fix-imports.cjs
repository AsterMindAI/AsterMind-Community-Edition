#!/usr/bin/env node
/**
 * Script to remove license code and fix imports when consolidating projects
 * 
 * Usage:
 *   node scripts/remove-license-and-fix-imports.js <source-file> <dest-file> [options]
 * 
 * Options:
 *   --fix-imports: Fix import paths from @astermind packages to relative paths
 *   --remove-license: Remove license imports and function calls (default: true)
 */

const fs = require('fs');
const path = require('path');

// License-related patterns to remove
const LICENSE_IMPORTS = [
  /import\s+.*\s+from\s+['"]\.\.\/core\/license\.js['"];?\s*\n/g,
  /import\s+.*\s+from\s+['"]\.\.\/\.\.\/core\/license\.js['"];?\s*\n/g,
  /import\s+.*\s+from\s+['"]\.\.\/\.\.\/\.\.\/core\/license\.js['"];?\s*\n/g,
  /import\s+.*\s+from\s+['"]@astermind\/astermind-premium['"];?\s*\n/g,
  /import\s+.*\s+from\s+['"]@astermind\/astermind-pro['"];?\s*\n/g,
  /import\s+.*\s+from\s+['"]@astermind\/astermind-synthetic-data['"];?\s*\n/g,
  /import\s+.*license.*\s+from\s+['"].*['"];?\s*\n/gi,
];

const LICENSE_FUNCTION_CALLS = [
  /requireLicense\(\);?\s*\/\/.*\n/g,
  /requireLicense\(\);?\s*\n/g,
  /checkLicense\(\);?\s*\/\/.*\n/g,
  /checkLicense\(\);?\s*\n/g,
  /initializeLicense\(\);?\s*\/\/.*\n/g,
  /initializeLicense\(\);?\s*\n/g,
  /await\s+initializeLicense\(\);?\s*\/\/.*\n/g,
  /await\s+initializeLicense\(\);?\s*\n/g,
  /setLicenseTokenFromString\([^)]+\);?\s*\/\/.*\n/g,
  /setLicenseTokenFromString\([^)]+\);?\s*\n/g,
  /await\s+setLicenseTokenFromString\([^)]+\);?\s*\/\/.*\n/g,
  /await\s+setLicenseTokenFromString\([^)]+\);?\s*\n/g,
  /setAndVerifyLicenseToken\([^)]+\);?\s*\/\/.*\n/g,
  /setAndVerifyLicenseToken\([^)]+\);?\s*\n/g,
  /checkSynthLicense\(\);?\s*\/\/.*\n/g,
  /checkSynthLicense\(\);?\s*\n/g,
];

// Import path mappings
const IMPORT_MAPPINGS = [
  {
    // From @astermind/astermind-elm to relative paths
    pattern: /from\s+['"]@astermind\/astermind-elm['"]/g,
    replacement: (match, filePath) => {
      // Calculate relative path from file to src/core
      const relativePath = getRelativePathToCore(filePath);
      return `from '${relativePath}'`;
    }
  },
  {
    // From @astermind/astermind-premium (shouldn't exist after removal, but just in case)
    pattern: /from\s+['"]@astermind\/astermind-premium['"]/g,
    replacement: () => {
      console.warn('Warning: Found @astermind/astermind-premium import - should be removed');
      return "from '../core/ELM.js'"; // Fallback
    }
  },
  {
    // From @astermind/astermind-pro
    pattern: /from\s+['"]@astermind\/astermind-pro['"]/g,
    replacement: () => {
      return "from '../pro/index.js'"; // Will need manual adjustment
    }
  },
  {
    // From @astermind/astermind-synthetic-data
    pattern: /from\s+['"]@astermind\/astermind-synthetic-data['"]/g,
    replacement: () => {
      return "from '../synth/index.js'"; // Will need manual adjustment
    }
  }
];

function getRelativePathToCore(filePath) {
  // Determine which core module is needed based on common patterns
  // This is a heuristic - may need manual adjustment
  const dir = path.dirname(filePath);
  const depth = dir.split(path.sep).filter(p => p && p !== 'src').length;
  
  // Common imports from ELM variants
  if (filePath.includes('elm/')) {
    return '../core/OnlineELM.js'; // Default, may need adjustment
  }
  
  // Calculate relative path
  const parts = [];
  for (let i = 0; i < depth; i++) {
    parts.push('..');
  }
  return parts.length > 0 ? `${parts.join('/')}/core/ELM.js` : './core/ELM.js';
}

function removeLicenseCode(content, filePath) {
  let cleaned = content;
  
  // Remove license imports
  for (const pattern of LICENSE_IMPORTS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove license function calls
  for (const pattern of LICENSE_FUNCTION_CALLS) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove license-related comments
  cleaned = cleaned.replace(/\/\/\s*Premium feature.*\n/gi, '');
  cleaned = cleaned.replace(/\/\/\s*requires valid license.*\n/gi, '');
  cleaned = cleaned.replace(/\/\/\s*License.*\n/gi, '');
  
  return cleaned;
}

function fixImports(content, filePath) {
  let fixed = content;
  
  for (const mapping of IMPORT_MAPPINGS) {
    if (typeof mapping.replacement === 'function') {
      fixed = fixed.replace(mapping.pattern, (match) => mapping.replacement(match, filePath));
    } else {
      fixed = fixed.replace(mapping.pattern, mapping.replacement);
    }
  }
  
  return fixed;
}

function processFile(sourcePath, destPath, options = {}) {
  const {
    removeLicense = true,
    fixImports: shouldFixImports = true
  } = options;
  
  try {
    // Read source file
    let content = fs.readFileSync(sourcePath, 'utf8');
    const originalContent = content;
    
    // Remove license code
    if (removeLicense) {
      content = removeLicenseCode(content, sourcePath);
    }
    
    // Fix imports
    if (shouldFixImports) {
      content = fixImports(content, sourcePath);
    }
    
    // Only write if content changed
    if (content !== originalContent) {
      // Ensure destination directory exists
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Write cleaned file
      fs.writeFileSync(destPath, content, 'utf8');
      console.log(`✓ Processed: ${path.basename(sourcePath)}`);
      return true;
    } else {
      console.log(`- No changes: ${path.basename(sourcePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error processing ${sourcePath}:`, error.message);
    return false;
  }
}

function processDirectory(sourceDir, destDir, options = {}) {
  const files = fs.readdirSync(sourceDir, { withFileTypes: true });
  let processed = 0;
  
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file.name);
    const destPath = path.join(destDir, file.name);
    
    if (file.isDirectory()) {
      // Recursively process subdirectories
      processDirectory(sourcePath, destPath, options);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
      // Skip license files
      if (file.name.includes('license') && !file.name.includes('test')) {
        console.log(`⊘ Skipping license file: ${file.name}`);
        continue;
      }
      
      if (processFile(sourcePath, destPath, options)) {
        processed++;
      }
    }
  }
  
  return processed;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage:
  node scripts/remove-license-and-fix-imports.js <source> <dest> [options]
  node scripts/remove-license-and-fix-imports.js --dir <source-dir> <dest-dir> [options]

Options:
  --no-remove-license    Don't remove license code
  --no-fix-imports       Don't fix import paths

Examples:
  # Process single file
  node scripts/remove-license-and-fix-imports.js src/elm/variant.ts src/elm/variant.ts

  # Process directory
  node scripts/remove-license-and-fix-imports.js --dir ../Astermind\ Premium/src/elm src/elm
    `);
    process.exit(1);
  }
  
  const options = {
    removeLicense: !args.includes('--no-remove-license'),
    fixImports: !args.includes('--no-fix-imports')
  };
  
  if (args[0] === '--dir') {
    // Directory mode
    const sourceDir = args[1];
    const destDir = args[2];
    
    if (!sourceDir || !destDir) {
      console.error('Error: --dir requires source and destination directories');
      process.exit(1);
    }
    
    console.log(`Processing directory: ${sourceDir} -> ${destDir}`);
    const count = processDirectory(sourceDir, destDir, options);
    console.log(`\n✓ Processed ${count} files`);
  } else {
    // Single file mode
    const sourcePath = args[0];
    const destPath = args[1] || sourcePath;
    
    if (!fs.existsSync(sourcePath)) {
      console.error(`Error: Source file not found: ${sourcePath}`);
      process.exit(1);
    }
    
    processFile(sourcePath, destPath, options);
  }
}

module.exports = { processFile, processDirectory, removeLicenseCode, fixImports };
