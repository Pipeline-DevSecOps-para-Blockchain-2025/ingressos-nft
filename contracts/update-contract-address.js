#!/usr/bin/env node

/**
 * Script to update contract address in frontend after deployment
 * Usage: node update-contract-address.js <contract_address>
 */

const fs = require('fs');
const path = require('path');

const contractAddress = process.argv[2];

if (!contractAddress) {
  console.error('Usage: node update-contract-address.js <contract_address>');
  process.exit(1);
}

// Validate address format
if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
  console.error('Invalid contract address format');
  process.exit(1);
}

// Update contracts/index.ts
const contractsIndexPath = path.join(__dirname, 'frontend/src/contracts/index.ts');
let contractsContent = fs.readFileSync(contractsIndexPath, 'utf8');

// Replace Sepolia address
contractsContent = contractsContent.replace(
  /11155111: '0x[a-fA-F0-9]{40}'/,
  `11155111: '${contractAddress}'`
);

fs.writeFileSync(contractsIndexPath, contractsContent);

// Update .env file
const envPath = path.join(__dirname, 'frontend/.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Update or add the contract address
if (envContent.includes('VITE_INGRESSOS_CONTRACT_ADDRESS_SEPOLIA=')) {
  envContent = envContent.replace(
    /VITE_INGRESSOS_CONTRACT_ADDRESS_SEPOLIA=.*/,
    `VITE_INGRESSOS_CONTRACT_ADDRESS_SEPOLIA=${contractAddress}`
  );
} else {
  envContent += `\nVITE_INGRESSOS_CONTRACT_ADDRESS_SEPOLIA=${contractAddress}\n`;
}

fs.writeFileSync(envPath, envContent);

console.log(`✅ Updated contract address to ${contractAddress}`);
console.log('✅ Updated frontend/src/contracts/index.ts');
console.log('✅ Updated frontend/.env');
console.log('\nNext steps:');
console.log('1. cd frontend');
console.log('2. pnpm dev');
console.log('3. Connect your wallet to Sepolia testnet');
console.log('4. Test the application!');