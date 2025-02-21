#!/bin/bash

# Define source and destination paths
SRC_WORKER="node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
DEST_WORKER="dist/pdf.worker.min.mjs"

# Check if source file exists
if [[ ! -f "$SRC_WORKER" ]]; then
    echo "Error: $SRC_WORKER does not exist." >&2
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$(dirname "$DEST_WORKER")"

# Copy the file
cp "$SRC_WORKER" "$DEST_WORKER"

echo "File copied successfully to $DEST_WORKER"