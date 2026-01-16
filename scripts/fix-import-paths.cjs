#!/usr/bin/env node
/**
 * Fix import paths in processed files
 * Corrects imports to use the right core modules
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Import corrections
const IMPORT_CORRECTIONS = [
  // ELM should come from ELM.js, not OnlineELM.js
  {
    pattern: /import\s+\{\s*ELM\s*\}\s+from\s+['"]\.\.\/core\/OnlineELM\.js['"]/g,
    replacement: "import { ELM } from '../core/ELM.js'"
  },
  // KernelELM should come from KernelELM.js
  {
    pattern: /import\s+\{\s*KernelELM\s*\}\s+from\s+['"]\.\.\/core\/OnlineELM\.js['"]/g,
    replacement: "import { KernelELM } from '../core/KernelELM.js'"
  },
  // Mixed imports - need to split
  {
    pattern: /import\s+\{\s*ELM\s*,\s*OnlineELM\s*\}\s+from\s+['"]\.\.\/core\/OnlineELM\.js['"]/g,
    replacement: "import { ELM } from '../core/ELM.js';\nimport { OnlineELM } from '../core/OnlineELM.js'"
  },
  {
    pattern: /import\s+\{\s*OnlineELM\s*,\s*ELM\s*\}\s+from\s+['"]\.\.\/core\/OnlineELM\.js['"]/g,
    replacement: "import { ELM } from '../core/ELM.js';\nimport { OnlineELM } from '../core/OnlineELM.js'"
  },
  // KernelELM with other imports
  {
    pattern: /import\s+\{\s*KernelELM\s*,\s*([^}]+)\}\s+from\s+['"]\.\.\/core\/OnlineELM\.js['"]/g,
    replacement: (match, p1) => {
      const others = p1.trim();
      return `import { KernelELM } from '../core/KernelELM.js';\nimport { ${others} } from '../core/OnlineELM.js'`;
    }
  }
];

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const correction of IMPORT_CORRECTIONS) {
      const newContent = content.replace(correction.pattern, (match) => {
        if (typeof correction.replacement === 'function') {
          return correction.replacement(match);
        }
        return correction.replacement;
      });
      
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed imports: ${path.basename(filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
if (require.main === module) {
  const targetDir = process.argv[2] || 'src/elm';
  
  console.log(`Fixing import paths in: ${targetDir}`);
  console.log('');
  
  // Find all TypeScript files
  const files = glob.sync(`${targetDir}/**/*.ts`, { cwd: process.cwd() });
  
  let fixed = 0;
  for (const file of files) {
    if (fixImportsInFile(file)) {
      fixed++;
    }
  }
  
  console.log(`\n✓ Fixed imports in ${fixed} files`);
}

module.exports = { fixImportsInFile };
