#!/bin/bash
set -e

echo "🔧 Generating test fixtures..."

# Create output directories
mkdir -p tests/fixtures/json
mkdir -p public/tests/fixtures/json

# Generate JSON fixtures for all .genea files
for genea_file in tests/fixtures/genea/*.genea; do
  if [[ -f "$genea_file" ]]; then
    # Extract filename without extension
    fixture_name=$(basename "$genea_file" .genea)
    
    echo "  Generating fixture: $fixture_name"
    
    # Generate JSON from .genea file
    cargo run -- json "$genea_file" "tests/fixtures/json/$fixture_name" > /dev/null 2>&1
    
    # Copy to public directory for test access
    cp -r "tests/fixtures/json/$fixture_name" "public/tests/fixtures/json/"
  fi
done

echo "✅ Test fixtures generated successfully"