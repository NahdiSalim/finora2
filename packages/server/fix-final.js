const fs = require('fs');
const path = require('path');

// Fix task.service.ts - remove subtasks destructuring and just delete the property
const taskFile = path.join(__dirname, 'src/modules/task/task.service.ts');
console.log('Fixing task.service.ts...');

let taskContent = fs.readFileSync(taskFile, 'utf8');

// Replace the destructuring pattern with a simpler approach
// Instead of: const { subtasks: _, ...taskData } = task;
// Use: const taskData = { ...task }; delete taskData.subtasks;
taskContent = taskContent.replace(
  /const \{ subtasks: _, \.\.\.taskData \} = task;/g,
  'const taskData = { ...task };\n      delete taskData.subtasks;'
);

fs.writeFileSync(taskFile, taskContent, 'utf8');
console.log('✓ Fixed task.service.ts');

// Fix request.service.ts - remove unused eslint-disable comment
const requestFile = path.join(__dirname, 'src/modules/request/request.service.ts');
console.log('Fixing request.service.ts...');

let requestContent = fs.readFileSync(requestFile, 'utf8');

// Remove the eslint-disable comment if it's not needed
requestContent = requestContent.replace(
  /\/\* eslint-disable @typescript-eslint\/ban-ts-comment \*\/\n/,
  ''
);

fs.writeFileSync(requestFile, requestContent, 'utf8');
console.log('✓ Fixed request.service.ts');

// Fix appointment.service.ts - remove unused eslint-disable comment
const appointmentFile = path.join(__dirname, 'src/modules/appointment/appointment.service.ts');
console.log('Fixing appointment.service.ts...');

let appointmentContent = fs.readFileSync(appointmentFile, 'utf8');

// Remove the eslint-disable comment if it's not needed
appointmentContent = appointmentContent.replace(
  /\/\* eslint-disable @typescript-eslint\/ban-ts-comment \*\/\n/,
  ''
);

fs.writeFileSync(appointmentFile, appointmentContent, 'utf8');
console.log('✓ Fixed appointment.service.ts');

console.log('\n✅ All files fixed!');
console.log('Now you can commit: git add . && git commit -m "fix(pirlo): add appointment and requests"');
