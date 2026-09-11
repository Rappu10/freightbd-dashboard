# Manual breve de usuario

## 1. Entrar al sistema

1. Abre https://freightbd-dashboard.vercel.app/.
2. Escribe la contraseña proporcionada por el administrador.
3. Pulsa **Entrar**.
4. La sesión permanece activa durante 12 horas.

No compartas la contraseña ni la guardes en un equipo público.

## 2. Registrar un cliente

1. En **Agregar nuevo cliente**, escribe el nombre completo.
2. Escribe la empresa o razón social si aplica.
3. Pulsa **Guardar cliente**.
4. El nuevo cliente aparecerá en la cartera.

El nombre debe contener nombre y apellido. Los campos inválidos muestran un
mensaje y no se envían al servidor.

## 3. Registrar un flete

1. En **Asignar flete de carga**, selecciona un cliente.
2. Selecciona el tipo de material.
3. Selecciona la unidad de medida.
4. Elige una fecha válida del año actual.
5. Captura cantidad y precio.
6. Pulsa **Añadir flete**.

El total del cliente se actualiza automáticamente.

## 4. Consultar información

- Usa **Buscar cliente o empresa** para filtrar la cartera.
- Usa el selector de orden para ver registros recientes, mayores totales o todos
  los clientes en orden alfabético.
- Revisa el panel de alertas para detectar clientes sin fletes, sin empresa o
  con facturación alta.
- El clima de Ciudad de México se muestra como referencia operativa cuando la
  API externa está disponible.

## 5. Reportes y eliminación

- Pulsa **Exportar reporte** para imprimir o guardar la información como PDF.
- Usa las opciones de eliminación únicamente después de confirmar el registro.
- Eliminar un cliente también elimina sus fletes asociados.
- El botón **Cerrar sesión** termina la sesión actual.

## 6. Problemas frecuentes

- Si la sesión expiró, vuelve a iniciar sesión.
- Si no aparecen datos, revisa la conexión y recarga la página.
- Si el servidor está temporalmente ocupado, espera unos segundos y vuelve a
  intentarlo.
