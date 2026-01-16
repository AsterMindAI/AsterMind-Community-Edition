#!/bin/bash
# Batch process Premium ELM variants - remove license and fix imports

SOURCE_DIR="/Users/julianwilkison-duran/Documents/Astermind Premium/src/elm"
DEST_DIR="/Users/julianwilkison-duran/Documents/AsterMind-ELM/src/elm"

echo "Processing Premium ELM variants..."
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"
echo ""

# Process all TypeScript files except index.ts (we'll handle that separately)
for file in "$SOURCE_DIR"/*.ts; do
    if [[ "$(basename "$file")" != "index.ts" ]]; then
        echo "Processing: $(basename "$file")"
        node scripts/remove-license-and-fix-imports.cjs "$file" "$DEST_DIR/$(basename "$file")"
    fi
done

echo ""
echo "✓ Batch processing complete!"
echo "Note: You may need to manually adjust import paths for specific core modules"
