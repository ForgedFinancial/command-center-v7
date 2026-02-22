const { exec } = require('child_process')
const util = require('util')
const path = require('path')

const execPromise = util.promisify(exec)

async function runCommand(command, options = {}) {
  const timeout = options.timeoutMs || 60_000
  const cwd = options.cwd || process.env.OPENCLAW_GATE_CWD || path.resolve(__dirname, '../../..')

  try {
    const { stdout, stderr } = await execPromise(command, { timeout, cwd })
    return {
      success: true,
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: 0,
      command,
      cwd,
    }
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      exitCode: typeof err.code === 'number' ? err.code : 1,
      command,
      cwd,
    }
  }
}

async function validateGates(task, pipelineConfig, options = {}) {
  const stageConfig = (pipelineConfig?.stages || []).find(stage => stage.id === task.stage)
  if (!stageConfig || !stageConfig.gates) {
    return { allPassed: true, results: {}, details: {} }
  }

  const results = {}
  const details = {}

  for (const [gateName, gateConfig] of Object.entries(stageConfig.gates)) {
    if (gateConfig.type === 'automated' && gateConfig.command) {
      const commandResult = await runCommand(gateConfig.command, options)
      const passed = commandResult.success
      results[gateName] = passed
      details[gateName] = {
        ...commandResult,
        description: gateConfig.description || gateName,
      }
      task.gates[gateName] = passed
    } else {
      const passed = task.gates[gateName] === true
      results[gateName] = passed
      details[gateName] = {
        success: passed,
        description: gateConfig.description || gateName,
        approver: gateConfig.approver || null,
        type: gateConfig.type || 'manual',
      }
    }
  }

  const allPassed = Object.values(results).every(Boolean)
  return { allPassed, results, details }
}

module.exports = {
  runCommand,
  validateGates,
}
