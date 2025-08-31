import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)
  
  const clients = new Set<WebSocket>()
  clients.add(socket)

  socket.onopen = () => {
    console.log('WebSocket client connected')
    
    // Send welcome message
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Blunari realtime service',
      timestamp: new Date().toISOString()
    }))

    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }))
      } else {
        clearInterval(heartbeat)
      }
    }, 30000) // Every 30 seconds
  }

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data)
      console.log('Received message:', message)

      switch (message.type) {
        case 'subscribe':
          // Handle subscription to specific channels
          socket.send(JSON.stringify({
            type: 'subscribed',
            channel: message.channel,
            timestamp: new Date().toISOString()
          }))
          break

        case 'analytics_event':
          // Handle analytics events
          console.log('Analytics event:', message.data)
          
          // Broadcast to all connected clients
          clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client !== socket) {
              client.send(JSON.stringify({
                type: 'analytics_update',
                data: message.data,
                timestamp: new Date().toISOString()
              }))
            }
          })
          break

        case 'notification':
          // Handle notifications
          console.log('Notification:', message)
          
          // Broadcast notification to all clients
          clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'notification',
                title: message.title,
                message: message.message,
                severity: message.severity || 'info',
                timestamp: new Date().toISOString()
              }))
            }
          })
          break

        default:
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
            timestamp: new Date().toISOString()
          }))
      }
    } catch (error) {
      console.error('Error processing message:', error)
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }))
    }
  }

  socket.onclose = () => {
    console.log('WebSocket client disconnected')
    clients.delete(socket)
  }

  socket.onerror = (error) => {
    console.error('WebSocket error:', error)
    clients.delete(socket)
  }

  return response
})