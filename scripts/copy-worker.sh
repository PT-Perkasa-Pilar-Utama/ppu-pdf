#!/bin/bash

# Define source and destination paths
SRC="node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
DEST="./src/pdf.worker.min.mjs"

# Check if source file exists
if [[ ! -f "$SRC" ]]; then
    echo "Error: $SRC does not exist." >&2
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$(dirname "$DEST")"

# Copy the file
cp "$SRC" "$DEST"

echo "File copied successfully to $DEST"