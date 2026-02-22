function getStageOrder(pipelineConfig) {
  return (pipelineConfig?.stages || []).map(stage => stage.id)
}

function getStageConfig(stageId, pipelineConfig) {
  return (pipelineConfig?.stages || []).find(stage => stage.id === stageId) || null
}

function allStageGatesPassed(task, stageConfig) {
  const gateNames = Object.keys(stageConfig.gates || {})
  if (gateNames.length === 0) return true
  return gateNames.every(gateName => task.gates[gateName] === true)
}

function getNextStage(currentStage, pipelineConfig) {
  const order = getStageOrder(pipelineConfig)
  const index = order.indexOf(currentStage)
  if (index === -1 || index >= order.length - 1) return null
  return order[index + 1]
}

function computeAutoAdvance(task, pipelineConfig) {
  const stageConfig = getStageConfig(task.stage, pipelineConfig)
  if (!stageConfig || stageConfig.autoAdvance !== true) return null
  if (!allStageGatesPassed(task, stageConfig)) return null
  return getNextStage(task.stage, pipelineConfig)
}

module.exports = {
  getStageOrder,
  getStageConfig,
  allStageGatesPassed,
  getNextStage,
  computeAutoAdvance,
}
