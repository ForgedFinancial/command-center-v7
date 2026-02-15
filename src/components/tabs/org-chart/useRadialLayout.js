// ========================================
// useRadialLayout — Pure math hook for radial node positioning
// BFS from centeredAgent, assigns orbit depth, calculates (x,y)
// ========================================

import { useMemo } from 'react'
import { AGENT_HIERARCHY } from '../../../config/constants'
import { SVG_CENTER, ORBITS, NODE_RADIUS, DRIFT } from './radialConstants'

const ORBIT_RADII = [ORBITS.CENTER, ORBITS.ORBIT_1, ORBITS.ORBIT_2, ORBITS.ORBIT_3]

// Build adjacency list (bidirectional parent-child)
function buildAdjacency() {
  const adj = {}
  Object.values(AGENT_HIERARCHY).forEach(agent => {
    if (!adj[agent.id]) adj[agent.id] = []
    if (agent.parent) {
      if (!adj[agent.parent]) adj[agent.parent] = []
      adj[agent.id].push(agent.parent)
      adj[agent.parent].push(agent.id)
    }
  })
  return adj
}

// BFS from centeredAgent, returns map of agentId -> depth
function bfsDepth(centerId, adj) {
  const depth = {}
  const queue = [centerId]
  depth[centerId] = 0
  while (queue.length > 0) {
    const current = queue.shift()
    const neighbors = adj[current] || []
    for (const neighbor of neighbors) {
      if (depth[neighbor] === undefined) {
        depth[neighbor] = depth[current] + 1
        queue.push(neighbor)
      }
    }
  }
  return depth
}

// Group agents by orbit depth (cap at 3)
function groupByOrbit(depthMap) {
  const orbits = [[], [], [], []]
  Object.entries(depthMap).forEach(([id, d]) => {
    const orbit = Math.min(d, 3)
    orbits[orbit].push(id)
  })
  return orbits
}

export default function useRadialLayout(centeredAgent, agentStatuses) {
  return useMemo(() => {
    const adj = buildAdjacency()
    const centerId = centeredAgent || 'ceo'
    const depthMap = bfsDepth(centerId, adj)

    // Include all agents even if disconnected from BFS
    Object.keys(AGENT_HIERARCHY).forEach(id => {
      if (depthMap[id] === undefined) {
        depthMap[id] = 3
      }
    })

    const orbitGroups = groupByOrbit(depthMap)

    // Calculate positions
    const nodes = []
    const startAngle = -Math.PI / 2 // 12 o'clock

    orbitGroups.forEach((group, orbitIndex) => {
      const baseRadius = ORBIT_RADII[orbitIndex]
      group.forEach((id, i) => {
        const count = group.length
        const angle = count === 1
          ? startAngle
          : startAngle + (i / count) * Math.PI * 2

        // Drift based on status
        const status = agentStatuses?.[id]?.status
        const driftMult = status === 'online' || status === 'active' || status === 'busy'
          ? DRIFT.active
          : status === 'offline'
            ? DRIFT.offline
            : DRIFT.default
        const radius = baseRadius * driftMult

        const x = SVG_CENTER + Math.cos(angle) * radius
        const y = SVG_CENTER + Math.sin(angle) * radius

        nodes.push({
          id,
          x,
          y,
          orbitIndex,
          nodeRadius: NODE_RADIUS[orbitIndex],
          angle,
          agent: AGENT_HIERARCHY[id],
        })
      })
    })

    // Build connections (parent-child pairs that exist in hierarchy)
    const connections = []
    const nodeMap = {}
    nodes.forEach(n => { nodeMap[n.id] = n })

    Object.values(AGENT_HIERARCHY).forEach(agent => {
      if (agent.parent && nodeMap[agent.id] && nodeMap[agent.parent]) {
        connections.push({
          from: agent.parent,
          to: agent.id,
          fromNode: nodeMap[agent.parent],
          toNode: nodeMap[agent.id],
        })
      }
    })

    return { nodes, connections, nodeMap }
  }, [centeredAgent, agentStatuses])
}
