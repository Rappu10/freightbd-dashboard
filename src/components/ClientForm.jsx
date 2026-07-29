import React, { useState } from 'react'

export default function ClientForm({ onAdd }) {
  const [name, setName] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim())
    setName('')
  }

  return (
    <form onSubmit={submit} className="mb-4">
      <input
        className="w-full border rounded px-3 py-2 mb-2"
        placeholder="Nombre del cliente"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="w-full bg-blue-600 text-white py-2 rounded">Agregar cliente</button>
    </form>
  )
}
