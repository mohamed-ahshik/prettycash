const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SPECS_DIR = path.join(__dirname, '../docs/superpowers/specs');
const PLANS_DIR = path.join(__dirname, '../docs/superpowers/plans');

function run() {
  console.log('=== PRETTYCASH LOOP RUNNER ===');
  console.log('1. Discovering Specs & Plans...');

  if (!fs.existsSync(SPECS_DIR)) {
    console.log('No specs directory found. Loop idle.');
    return;
  }

  const specs = fs.readdirSync(SPECS_DIR).filter(f => f.endsWith('.md'));
  let activeSpec = null;
  let activePlanPath = null;
  let specContent = '';

  for (const spec of specs) {
    const specPath = path.join(SPECS_DIR, spec);
    const content = fs.readFileSync(specPath, 'utf8');
    const statusMatch = content.match(/Implementation status:\s*(.+)/i);
    if (statusMatch) {
      const status = statusMatch[1].trim();
      if (status !== 'Implemented' && status !== 'Completed') {
        activeSpec = spec;
        specContent = content;
        // Map: YYYY-MM-DD-topic-design.md -> YYYY-MM-DD-topic.md
        const planName = spec.replace('-design.md', '.md');
        activePlanPath = path.join(PLANS_DIR, planName);
        console.log(`-> Found Active Spec: ${spec} (Status: ${status})`);
        break;
      }
    }
  }

  if (!activeSpec) {
    console.log('All specs are marked Implemented! Nothing to do.');
    return;
  }

  if (!fs.existsSync(activePlanPath)) {
    console.log(`Plan file not found: ${activePlanPath}. Please create a plan for this spec.`);
    return;
  }

  console.log(`-> Found Matching Plan: ${path.basename(activePlanPath)}`);
  console.log('\n2. Parsing Plan Tasks...');

  const planContent = fs.readFileSync(activePlanPath, 'utf8');
  const lines = planContent.split('\n');

  let currentTask = 'Unknown Task';
  let currentTaskFiles = [];
  let pendingStep = null;
  let pendingStepLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Identify tasks
    const taskMatch = line.match(/^#+\s*Task\s+\d+:\s*(.+)/i);
    if (taskMatch) {
      currentTask = line.trim();
      currentTaskFiles = [];
      // Look ahead for "Files:" block to collect files
      let j = i + 1;
      while (j < lines.length && !lines[j].match(/^#+\s*Task/i)) {
        const fileMatch = lines[j].match(/^\s*-\s*(Create|Modify):\s*`([^`]+)`/);
        if (fileMatch) {
          currentTaskFiles.push(fileMatch[2]);
        }
        j++;
      }
    }

    // Find the first unchecked step
    if (line.trim().startsWith('- [ ]')) {
      pendingStep = line.trim();
      pendingStepLineIdx = i;
      break;
    }
  }

  if (!pendingStep) {
    console.log('-> All steps in this plan are checked! Checking if we can close the spec status.');
    // Check if we need to update spec status
    updateSpecStatus(activeSpec, specContent);
    return;
  }

  console.log(`\n========================================`);
  console.log(`CURRENT PENDING WORK:`);
  console.log(`Task: ${currentTask}`);
  if (currentTaskFiles.length > 0) {
    console.log(`Files involved:`);
    currentTaskFiles.forEach(f => console.log(`  - ${f}`));
  }
  console.log(`Step: ${pendingStep}`);
  console.log(`========================================`);

  console.log('\n3. Verifying Codebase Quality (TypeScript Check)...');
  let tscOk = false;
  try {
    // Check if typescript is installed in workspace before running
    if (fs.existsSync(path.join(__dirname, '../node_modules/typescript'))) {
      execSync('npx tsc --noEmit', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      console.log('-> TypeScript Check: PASSED ✓');
      tscOk = true;
    } else {
      console.log('-> TypeScript not installed yet (Task 1 pending). Skipping verification.');
      tscOk = true; // Let it proceed if not initialized
    }
  } catch (err) {
    console.log('-> TypeScript Check: FAILED ✗');
    console.log('Fix the compilation errors before completing the task.');
  }

  console.log('\n4. Loop Recommendation:');
  const actionPrompt = `Implement ${currentTask} / ${pendingStep} in PrettyCash.
Files to look at: ${currentTaskFiles.join(', ')}.
Ensure strict adherence to types and design tokens.`;

  console.log(`Run this subagent to execute the next step:`);
  console.log(`----------------------------------------`);
  console.log(`[tool_call: task]`);
  console.log(`description: "Implement ${currentTask.substring(0, 30)}..."`);
  console.log(`subagent_type: "general"`);
  console.log(`prompt: "${actionPrompt.replace(/"/g, '\\"')}"`);
  console.log(`----------------------------------------`);

  // Simple prompt to mark step as done (if the user wants to run this interactively)
  console.log(`\nTo mark this step as completed in the plan, run this script with "--complete" flag.`);
}

function updateSpecStatus(specFile, originalContent) {
  const specPath = path.join(SPECS_DIR, specFile);
  let updated = originalContent.replace(/Implementation status:\s*Not started/i, 'Implementation status: Implemented — main pages complete');
  updated = updated.replace(/Implementation status:\s*In progress/i, 'Implementation status: Implemented — main pages complete');
  fs.writeFileSync(specPath, updated, 'utf8');
  console.log(`-> Updated Spec ${specFile} status to "Implemented — main pages complete" ✓`);
}

function completeStep() {
  // Read active spec to find matching plan
  if (!fs.existsSync(SPECS_DIR)) return;
  const specs = fs.readdirSync(SPECS_DIR).filter(f => f.endsWith('.md'));
  let activePlanPath = null;
  let activeSpec = null;
  let specContent = '';

  for (const spec of specs) {
    const specPath = path.join(SPECS_DIR, spec);
    const content = fs.readFileSync(specPath, 'utf8');
    const statusMatch = content.match(/Implementation status:\s*(.+)/i);
    if (statusMatch) {
      const status = statusMatch[1].trim();
      if (status !== 'Implemented' && status !== 'Completed') {
        activeSpec = spec;
        specContent = content;
        const planName = spec.replace('-design.md', '.md');
        activePlanPath = path.join(PLANS_DIR, planName);
        break;
      }
    }
  }

  if (!activePlanPath || !fs.existsSync(activePlanPath)) {
    console.log('No active plan found to complete a step.');
    return;
  }

  const planContent = fs.readFileSync(activePlanPath, 'utf8');
  const lines = planContent.split('\n');
  let completed = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('- [ ]')) {
      const original = lines[i];
      lines[i] = lines[i].replace('- [ ]', '- [x]');
      console.log(`Marking step complete:\n  Old: ${original}\n  New: ${lines[i]}`);
      completed = true;
      break;
    }
  }

  if (completed) {
    fs.writeFileSync(activePlanPath, lines.join('\n'), 'utf8');
    console.log('Plan file updated successfully ✓');

    // Also update spec status to "In progress" if it was "Not started"
    if (specContent.includes('Implementation status: Not started')) {
      const specPath = path.join(SPECS_DIR, activeSpec);
      const updated = specContent.replace('Implementation status: Not started', 'Implementation status: In progress');
      fs.writeFileSync(specPath, updated, 'utf8');
      console.log('Updated Spec status to "In progress" ✓');
    }
  } else {
    console.log('No pending steps found to complete.');
  }
}

// CLI Arg Parsing
if (process.argv.includes('--complete')) {
  completeStep();
} else {
  run();
}
