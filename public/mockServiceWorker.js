/* eslint-disable */
/* tslint:disable */

/**
 * Mock Service Worker (2.6.8).
 * @see https://github.com/mswjs/msw
  */

const INTEGRITY_CHECKSUM = '2575a40994998e1f0e9987823f2b40a3'
const activeClientIds = new Set()

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', async function (event) {
  const clientId = event.source.id

  if (!clientId) {
    return
  }

  const client = await self.clients.get(clientId)

  if (!client) {
    return
  }

  const allClients = await self.clients.matchAll({
    type: 'window',
  })

  switch (event.data) {
    case 'KEEPALIVE_REQUEST': {
      sendToClient(client, {
        type: 'KEEPALIVE_RESPONSE',
      })
      break
    }

    case 'INTEGRITY_CHECK_REQUEST': {
      sendToClient(client, {
        type: 'INTEGRITY_CHECK_RESPONSE',
        payload: INTEGRITY_CHECKSUM,
      })
      break
    }

    case 'MOCK_ACTIVATE': {
      activeClientIds.add(clientId)

      sendToClient(client, {
        type: 'MOCKING_ENABLED',
        payload: true,
      })
      break
    }

    case 'MOCK_DEACTIVATE': {
      activeClientIds.delete(clientId)
      break
    }

    case 'CLIENT_CLOSED': {
      activeClientIds.delete(clientId)

      const remainingClients = allClients.filter((client) => {
        return client.id !== clientId
      })

      if (remainingClients.length === 0) {
        self.registration.unregister()
      }
      break
    }

    default:
      break
  }
})

self.addEventListener('fetch', function (event) {
  const { request } = event

  if (request.mode === 'navigate') {
    return
  }

  if (request.url.startsWith('chrome-extension://')) {
    return
  }

  event.respondWith(
    handleRequest(event, request).catch((error) => {
      console.error(
        '[MSW] Failed to mock a "%s" request to "%s": %s',
        request.method,
        request.url,
        error
      )
      return fetch(request)
    })
  )
})

async function handleRequest(event, request) {
  const client = await resolveMainClient(event)

  if (!client) {
    return fetch(request)
  }

  const response = await sendToClient(client, {
    type: 'REQUEST',
    payload: {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      mode: request.mode,
      credentials: request.credentials,
      cache: request.cache,
      redirect: request.redirect,
      referrer: request.referrer,
      body: await request.clone().arrayBuffer(),
    },
  })

  if (response.type === 'MOCK_NOT_FOUND') {
    return fetch(request)
  }

  if (response.type === 'MOCK_SUCCESS') {
    const { status, statusText, headers, body } = response.payload
    return new Response(body, {
      status,
      statusText,
      headers: new Headers(headers),
    })
  }

  return fetch(request)
}

async function resolveMainClient(event) {
  const client = await self.clients.get(event.clientId)

  if (client) {
    return client
  }

  const allClients = await self.clients.matchAll({
    type: 'window',
  })

  return allClients.find((client) => activeClientIds.has(client.id))
}

function sendToClient(client, message) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()

    channel.port1.onmessage = (event) => {
      if (event.data && event.data.error) {
        return reject(event.data.error)
      }

      resolve(event.data)
    }

    client.postMessage(message, [channel.port2])
  })
}
