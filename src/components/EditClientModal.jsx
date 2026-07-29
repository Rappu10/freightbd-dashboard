import React, { useEffect, useState } from 'react'
import Modal from './Modal'

export default function EditClientModal({ client, onSave, onCancel }) {
  const [name, setName] = useState(client?.name || '')

  useEffect(() => setName(client?.name || ''), [client])

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim())
  }

  if (!client) return null

  return (
    <Modal title={`Editar cliente`} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-2 py-2" />
        </div>
        <div className="flex justify-end space-x-2">
          <button type="button" className="px-3 py-2 rounded" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
