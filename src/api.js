const STORAGE_KEY = 'freightbd_data'

async function pingBackend() {
  try {
    const res = await fetch('/api/ping')
    return res.ok
  } catch (e) {
    return false
  }
}

async function useBackend() {
  if (typeof window === 'undefined') return false
  if (window.__useBackend !== undefined) return window.__useBackend
  const ok = await pingBackend()
  window.__useBackend = ok
  return ok
}

async function getClients() {
  if (await useBackend()) {
    const res = await fetch('/api/clients')
    return res.json()
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

async function addClient(name) {
  if (await useBackend()) {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    return res.json()
  }
  const clients = await getClients()
  const id = Date.now().toString()
  const newClient = { id, name, freights: [] }
  clients.push(newClient)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
  return newClient
}

async function updateClient(id, name) {
  if (await useBackend()) {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    return res.json()
  }
  const clients = await getClients()
  const idx = clients.findIndex((c) => c.id === id)
  if (idx >= 0) clients[idx].name = name
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
  return clients[idx]
}

async function deleteClient(id) {
  if (await useBackend()) {
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    return res.json()
  }
  const clients = await getClients()
  const newClients = clients.filter((c) => c.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newClients))
  return { ok: true }
}

async function addFreight(clientId, freight) {
  if (await useBackend()) {
    const res = await fetch(`/api/clients/${clientId}/freights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(freight),
    })
    return res.json()
  }
  const clients = await getClients()
  const client = clients.find((c) => c.id === clientId)
  const id = Date.now().toString()
  const f = { id, ...freight }
  if (client) {
    client.freights.push(f)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
  }
  return f
}

async function updateFreight(id, updates) {
  if (await useBackend()) {
    const res = await fetch(`/api/freights/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return res.json()
  }
  const clients = await getClients()
  let found = null
  for (const c of clients) {
    const f = c.freights.find((x) => x.id === id)
    if (f) {
      f.material = updates.material
      f.quantity = updates.quantity
      f.price = updates.price
      found = f
      break
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
  return found
}

async function deleteFreight(id) {
  if (await useBackend()) {
    const res = await fetch(`/api/freights/${id}`, { method: 'DELETE' })
    return res.json()
  }
  const clients = await getClients()
  for (const c of clients) {
    const idx = c.freights.findIndex((f) => f.id === id)
    if (idx >= 0) {
      c.freights.splice(idx, 1)
      break
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
  return { ok: true }
}

export default {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  addFreight,
  updateFreight,
  deleteFreight,
}
