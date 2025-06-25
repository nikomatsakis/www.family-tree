#!/usr/bin/env node

/**
 * Encrypts JSON files in public/api/v1/ if FAMILY_TREE_PASSWORD is set
 *
 * Usage:
 *   node scripts/encrypt-json.js public/api/v1/
 *   FAMILY_TREE_PASSWORD="secret" node scripts/encrypt-json.js public/api/v1/
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const KEY_ITERATIONS = 100000;

/**
 * Derives encryption key from password using PBKDF2
 */
async function deriveKey(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      KEY_ITERATIONS,
      32,
      'sha256',
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      },
    );
  });
}

/**
 * Encrypts data using AES-256-CBC
 */
async function encryptData(data, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = await deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Format: salt + iv + encrypted data
  const result = {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: encrypted,
  };

  return JSON.stringify(result);
}

/**
 * Encrypts all JSON files in a directory
 */
async function encryptDirectory(directoryPath) {
  const password = process.env.FAMILY_TREE_PASSWORD;

  if (!password) {
    console.log('FAMILY_TREE_PASSWORD not set - skipping encryption');
    return;
  }

  if (!fs.existsSync(directoryPath)) {
    console.error(`Directory not found: ${directoryPath}`);
    process.exit(1);
  }

  const files = fs.readdirSync(directoryPath);
  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log('No JSON files found to encrypt');
    return;
  }

  console.log(`Encrypting ${jsonFiles.length} JSON files with AES-256-CBC...`);

  for (const file of jsonFiles) {
    const inputPath = path.join(directoryPath, file);
    const outputPath = path.join(directoryPath, file + '.enc');

    try {
      const jsonData = fs.readFileSync(inputPath, 'utf8');
      const encryptedData = await encryptData(jsonData, password);

      fs.writeFileSync(outputPath, encryptedData);
      console.log(`✓ ${file} → ${file}.enc`);

      // Remove original unencrypted file
      fs.unlinkSync(inputPath);
      console.log(`✓ Removed unencrypted ${file}`);
    } catch (error) {
      console.error(`✗ Failed to encrypt ${file}:`, error.message);
      process.exit(1);
    }
  }

  console.log('✅ Encryption complete!');
}

// Main execution
if (require.main === module) {
  const directoryPath = process.argv[2];

  if (!directoryPath) {
    console.error('Usage: node scripts/encrypt-json.js <directory>');
    console.error('Example: node scripts/encrypt-json.js public/api/v1/');
    process.exit(1);
  }

  encryptDirectory(directoryPath).catch((error) => {
    console.error('Encryption failed:', error);
    process.exit(1);
  });
}

module.exports = { encryptDirectory, encryptData, deriveKey };
