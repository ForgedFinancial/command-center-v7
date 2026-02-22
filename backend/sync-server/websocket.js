const WebSocket = require('ws')

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function initOpsWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ops' })

  wss.on('connection', ws => {
    ws.subscriptions = {
      tasks: new Set(),
      logs: new Set(),
    }

    ws.on('message', raw => {
      const message = safeParse(raw)
      if (!message || !message.type) return

      if (message.type === 'subscribe.task' && message.taskId) {
        ws.subscriptions.tasks.add(message.taskId)
      }

      if (message.type === 'unsubscribe.task' && message.taskId) {
        ws.subscriptions.tasks.delete(message.taskId)
      }

      if (message.type === 'subscribe.logs' && message.taskId) {
        ws.subscriptions.logs.add(message.taskId)
      }
    })
  })

  wss.broadcast = function broadcast(data, predicate) {
    const payload = JSON.stringify(data)
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue
      if (typeof predicate === 'function' && !predicate(client)) continue
      client.send(payload)
    }
  }

  wss.broadcastTask = function broadcastTask(taskId, data) {
    wss.broadcast(data, client => {
      if (!client.subscriptions) return true
      if (client.subscriptions.tasks.size === 0) return true
      return client.subscriptions.tasks.has(taskId)
    })
  }

  return wss
}

module.exports = {
  initOpsWebSocket,
}
