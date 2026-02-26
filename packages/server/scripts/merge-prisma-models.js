const fs = require('fs');
const path = require('path');

// Read all model files
const modelsDir = path.join(__dirname, '../prisma/models');
const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

// Read base schema (without url for Prisma 7)
let schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

`;

// Read all .prisma files from models directory
const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.prisma'));

console.log(`Found ${modelFiles.length} model files:`);
modelFiles.forEach(file => console.log(`  - ${file}`));

// Append each model to schema
modelFiles.forEach(file => {
  const modelPath = path.join(modelsDir, file);
  const modelContent = fs.readFileSync(modelPath, 'utf8');
  schema += `\n// From ${file}\n`;
  schema += modelContent;
  schema += '\n';
});

// Write combined schema
fs.writeFileSync(schemaPath, schema);
console.log(`\n✅ Schema merged successfully to ${schemaPath}`);
console.log(`\nRun: npx prisma generate`);
