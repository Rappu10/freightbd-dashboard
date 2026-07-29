const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

const leerDatos = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error("Error leyendo data.json:", error);
    return [];
  }
};

const guardarDatos = (datos) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(datos, null, 2));
    console.log("💾 data.json actualizado correctamente en el disco.");
  } catch (error) {
    console.error("❌ Error escribiendo en data.json:", error);
  }
};

// [GET] Obtener clientes
app.get('/api/clientes', (req, res) => {
  try {
    const clientes = leerDatos();
    const clientesConTotales = clientes.map(cliente => {
      const totalFinal = (cliente.fletes || []).reduce((sum, flete) => sum + (Number(flete.precio) || 0), 0);
      return { ...cliente, totalFinal };
    });
    res.json(clientesConTotales);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los clientes' });
  }
});

// [POST] Crear Cliente
app.post('/api/clientes', (req, res) => {
  try {
    const { nombre, empresa } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const clientes = leerDatos();
    const nuevoCliente = {
      id: Date.now().toString(),
      nombre,
      empresa: empresa || 'Particular',
      fletes: [],
      totalFinal: 0
    };

    clientes.push(nuevoCliente);
    guardarDatos(clientes);
    res.status(201).json(nuevoCliente);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el cliente' });
  }
});

// [POST] Agregar Flete
app.post('/api/clientes/:id/fletes', (req, res) => {
  try {
    const { id } = req.params;
    const { tipoMaterial, cantidad, precio, fecha } = req.body;

    if (!tipoMaterial || !cantidad || !precio) {
      return res.status(400).json({ error: 'Campos obligatorios incompletos' });
    }

    const clientes = leerDatos();
    const clienteIndex = clientes.findIndex(c => String(c.id) === String(id));
    if (clienteIndex === -1) return res.status(404).json({ error: 'Cliente no encontrado' });

    const fechaFlete = fecha ? fecha : new Date().toISOString().split('T')[0];

    const nuevoFlete = {
      id: Date.now().toString(),
      tipoMaterial,
      cantidad: Number(cantidad),
      precio: Number(precio),
      fecha: fechaFlete 
    };

    if (!clientes[clienteIndex].fletes) clientes[clienteIndex].fletes = [];
    clientes[clienteIndex].fletes.push(nuevoFlete);
    clientes[clienteIndex].totalFinal = clientes[clienteIndex].fletes.reduce((sum, f) => sum + f.precio, 0);

    guardarDatos(clientes);
    res.status(201).json(clientes[clienteIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar el flete' });
  }
});

// [DELETE] Eliminar un Cliente por completo (CORREGIDO)
app.delete('/api/clientes/:id', (req, res) => {
  try {
    const idBuscar = String(req.params.id);
    console.log("🗑️ Solicitud de borrado para cliente ID:", idBuscar);
    
    const clientesOriginales = leerDatos();
    const clientesFiltrados = clientesOriginales.filter(c => String(c.id) !== idBuscar);
    
    guardarDatos(clientesFiltrados);
    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

// [DELETE] Eliminar un flete específico (CORREGIDO)
app.delete('/api/clientes/:clienteId/fletes/:fleteId', (req, res) => {
  try {
    const idCliente = String(req.params.clienteId);
    const idFlete = String(req.params.fleteId);
    console.log(`🗑️ Solicitud de borrado para flete ID: ${idFlete} del cliente ID: ${idCliente}`);

    const clientes = leerDatos();
    const clienteIndex = clientes.findIndex(c => String(c.id) === idCliente);

    if (clienteIndex === -1) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Filtrado estricto de fletes
    clientes[clienteIndex].fletes = (clientes[clienteIndex].fletes || []).filter(f => String(f.id) !== idFlete);
    
    // Recalcular total
    clientes[clienteIndex].totalFinal = clientes[clienteIndex].fletes.reduce((sum, f) => sum + (Number(f.precio) || 0), 0);

    guardarDatos(clientes);
    res.json(clientes[clienteIndex]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar flete' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor FreightBD corriendo en http://localhost:${PORT}`);
});