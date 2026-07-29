import React, { useEffect, useState } from 'react'
import Modal from './Modal'

export default function EditFreightModal({ freight, onSave, onCancel }) {
  const [material, setMaterial] = useState(freight?.material || '')
  const [quantity, setQuantity] = useState(freight?.quantity || 1)
  const [price, setPrice] = useState(freight?.price || 0)

  useEffect(() => {
    setMaterial(freight?.material || '')
    setQuantity(freight?.quantity || 1)
    setPrice(freight?.price || 0)
  }, [freight])

  function submit(e) {
    e.preventDefault()
    if (!material.trim()) return
    onSave({ material: material.trim(), quantity: Number(quantity), price: Number(price) })
  }

  if (!freight) return null

  return (
    <Modal title={`Editar flete`} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600">Material</label>
          <input value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full border rounded px-2 py-2" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm text-gray-600">Cantidad</label>
            <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full border rounded px-2 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Precio</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded px-2 py-2" />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button type="button" className="px-3 py-2 rounded" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
