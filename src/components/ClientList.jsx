import React from 'react'

export default function ClientList({ clients, onSelect, onRemove, onEdit, selectedId }) {
  return (
    <div className="space-y-2">
      {clients.map((c) => {
        const total = c.freights.reduce((a, f) => a + f.quantity * f.price, 0)
        return (
          <div
            key={c.id}
            className={`p-3 rounded border cursor-pointer flex justify-between items-center ${c.id === selectedId ? 'border-blue-400 bg-blue-50' : 'bg-white'}`}
            onClick={() => onSelect(c.id)}
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-gray-500">S/ {total.toFixed(2)}</div>
            </div>
            <div>
              <button
                className="text-sm text-blue-600 mr-3"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit && onEdit(c.id)
                }}
              >Editar
              </button>

              <button
                className="text-sm text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(c.id)
                }}
              >Eliminar
              </button>
            </div>
          </div>
        )
      })}
      {clients.length === 0 && <div className="text-gray-500">No hay clientes aún.</div>}
    </div>
  )
}
