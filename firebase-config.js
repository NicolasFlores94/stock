// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFzT8YssfvzYoLOojwZg4zQBD6n30Lm2Q",
  authDomain: "control-stock-c1d77.firebaseapp.com",
  projectId: "control-stock-c1d77",
  storageBucket: "control-stock-c1d77.firebasestorage.app",
  messagingSenderId: "1083635451031",
  appId: "1:1083635451031:web:09386c2f1a103888b695d2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variables
const form = document.getElementById('productForm');
const productList = document.getElementById('productList');
let products = [];
let historialVentas = [];
let ventasPorProducto = {};
let totalVentas = 0;
let turnoActivo = false;
let turnoId = null;
let productoActualIndex = null;

// Cargar datos desde Firebase al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  await cargarDesdeFirebase();
  renderAll();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const price = parseFloat(document.getElementById('price').value);
  const quantity = parseInt(document.getElementById('quantity').value);
  products.push({ name, price, quantity });
  form.reset();
  guardarEnFirebase();
});

document.getElementById('buscador').addEventListener('input', filtrarProductos);

window.abrirTurno = () => {
  if (turnoActivo) return alert("Ya hay un turno activo.");
  turnoActivo = true;
  totalVentas = 0;
  historialVentas = [];
  ventasPorProducto = {};

  const ahora = new Date();
  turnoId = `${ahora.toLocaleDateString()} ${ahora.toLocaleTimeString()}`;
  ventasPorProducto[turnoId] = {};
  guardarEnFirebase();
  alert("Turno iniciado.");
};

window.cerrarTurno = () => {
  if (!turnoActivo) return alert("No hay un turno activo.");
  turnoActivo = false;
  alert(`Turno cerrado.\nTotal vendido: $${totalVentas.toFixed(2)}`);
  guardarEnFirebase();
};

window.sellProduct = (index) => {
  if (!turnoActivo) return alert("Debes abrir un turno para vender.");
  const producto = products[index];
  if (producto.quantity <= 0) return alert("Sin stock.");
  productoActualIndex = index;
  document.getElementById('metodoPagoModal').classList.remove('hidden');
};

window.confirmarMetodoPago = (metodo) => {
  const producto = products[productoActualIndex];
  producto.quantity--;
  totalVentas += producto.price;

  const hora = new Date().toLocaleString();
  historialVentas.push({ nombre: producto.name, precio: producto.price, hora, metodo });

  if (!ventasPorProducto[turnoId]) ventasPorProducto[turnoId] = {};
  if (!ventasPorProducto[turnoId][producto.name]) {
    ventasPorProducto[turnoId][producto.name] = { unidades: 0, total: 0, efectivo: 0, mp: 0 };
  }

  const datos = ventasPorProducto[turnoId][producto.name];
  datos.unidades++;
  datos.total += producto.price;
  datos[metodo] += producto.price;

  document.getElementById('metodoPagoModal').classList.add('hidden');
  guardarEnFirebase();
};

async function guardarEnFirebase() {
  await setDoc(doc(db, "stock", "datos"), {
    products,
    historialVentas,
    ventasPorProducto,
    totalVentas,
    turnoActivo,
    turnoId
  });
  renderAll();
}

async function cargarDesdeFirebase() {
  const snap = await getDoc(doc(db, "stock", "datos"));
  if (snap.exists()) {
    const data = snap.data();
    products = data.products || [];
    historialVentas = data.historialVentas || [];
    ventasPorProducto = data.ventasPorProducto || {};
    totalVentas = data.totalVentas || 0;
    turnoActivo = data.turnoActivo || false;
    turnoId = data.turnoId || null;
  }
}

function renderAll() {
  renderProducts();
  renderHistorialVentas();
  document.getElementById('totalVentasDisplay').textContent = `Total de Ventas: $${totalVentas.toFixed(2)}`;
  document.getElementById('estadoTurno').textContent = turnoActivo ? "Turno abierto" : "Turno cerrado";
}

function renderProducts() {
  productList.innerHTML = '';
  products.forEach((p, i) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.name}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td>${p.quantity}</td>
      <td>$${(p.price * p.quantity).toFixed(2)}</td>
      <td>
        <button onclick="sellProduct(${i})">Vender</button>
      </td>`;
    productList.appendChild(row);
  });
}

function renderHistorialVentas() {
  const lista = document.getElementById('historialVentas');
  lista.innerHTML = '';
  historialVentas.forEach((venta) => {
    const li = document.createElement('li');
    li.textContent = `${venta.hora} - ${venta.nombre} - $${venta.precio.toFixed(2)} - ${venta.metodo}`;
    lista.appendChild(li);
  });
}

function filtrarProductos() {
  const texto = document.getElementById('buscador').value.toLowerCase();
  const filas = productList.querySelectorAll('tr');
  products.forEach((product, index) => {
    const visible = product.name.toLowerCase().includes(texto);
    filas[index].style.display = visible ? '' : 'none';
  });
}

