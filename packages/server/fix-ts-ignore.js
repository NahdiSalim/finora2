const fs = require('fs');
const path = require('path');

const files = [
  'src/modules/request/request.service.ts',
  'src/modules/appointment/appointment.service.ts',
  'src/modules/task/task.service.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  console.log(`Fixing ${file}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace @ts-expect-error without description with one that has description
  content = content.replace(/@ts-expect-error\s*$/gm, '@ts-expect-error - Prisma types not yet generated');
  content = content.replace(/@ts-expect-error\s*\n/g, '@ts-expect-error - Prisma types not yet generated\n');
  
  // Fix unused variables in task.service.ts
  if (file.includes('task.service.ts')) {
    // Add eslint-disable-next-line on the same line as const { subtasks: _, ...taskData }
    content = content.replace(/const \{ subtasks: _,/g, 'const { subtasks: _, // eslint-disable-line @typescript-eslint/no-unused-vars');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Fixed ${file}`);
});

console.log('\n✅ All files fixed!');
console.log('Run: git add . && git commit -m "fix(pirlo): add appointment and requests"');
