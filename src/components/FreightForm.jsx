import React, { useState } from 'react'

export default function FreightForm({ onAdd }) {
  const [material, setMaterial] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(0)

  function submit(e) {
    e.preventDefault()
    if (!material.trim() || quantity <= 0 || price < 0) return
    onAdd({ material: material.trim(), quantity: Number(quantity), price: Number(price) })
    setMaterial('')
    setQuantity(1)
    setPrice(0)
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-4 gap-2 items-end">
      <div className="col-span-2">
        <label className="block text-sm text-gray-600">Material</label>
        <input value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full border rounded px-2 py-2" />
      </div>

      <div>
        <label className="block text-sm text-gray-600">Cantidad</label>
        <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full border rounded px-2 py-2" />
      </div>

      <div>
        <label className="block text-sm text-gray-600">Precio</label>
        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded px-2 py-2" />
      </div>

      <div className="col-span-4">
        <button className="mt-2 bg-green-600 text-white py-2 px-4 rounded">Agregar flete</button>
      </div>
    </form>
  )
}
