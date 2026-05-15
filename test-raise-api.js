/**
 * Script de prueba para la conexión con Impresoras Raise3D Pro3
 * Ejecuta este archivo en tu terminal con: node scripts/test-raise-api.js
 */

// ============================================================================
// MÉTODO 1: LOCAL HTTP API (Recomendado para ERPs en la misma red local)
// ============================================================================
// 1. En la pantalla de tu Pro3 ve a: Ajustes > Máquina > Desarrollador
// 2. Activa "Enable Remote Access API"
// 3. Entra desde tu navegador a http://<IP_DE_LA_IMPRESORA>:10800 para ver la documentación y endpoints exactos.

const PRINTER_IP = "192.168.1.X"; // <-- CAMBIA ESTO POR LA IP DE TU IMPRESORA
const LOCAL_API_URL = `http://${PRINTER_IP}:10800/api/v1/status`; // El endpoint puede variar según la versión de firmware

async function testLocalApi() {
  console.log(`\n📡 Probando conexión Local a la impresora ${PRINTER_IP}...`);
  try {
    const res = await fetch(LOCAL_API_URL);
    const data = await res.json();
    console.log("✅ [ÉXITO] Conexión Local Establecida. Respuesta de la impresora:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("❌ [ERROR] Falló la conexión local:", err.message);
    console.log("Asegúrate de que la IP sea correcta y la API Remota esté activada en la pantalla de la máquina.");
  }
}

// ============================================================================
// MÉTODO 2: RAISECLOUD OPEN API (Si usas la nube de Raise3D)
// ============================================================================
const RAISECLOUD_TOKEN = "AQUI_TU_TOKEN_DE_RAISECLOUD"; // Generado en tu cuenta de RaiseCloud

async function testRaiseCloudApi() {
  console.log(`\n☁️ Probando conexión a RaiseCloud...`);
  try {
    const res = await fetch("https://openapi.raise3d.com/v1/printers", {
      headers: { "Authorization": `Bearer ${RAISECLOUD_TOKEN}`, "Content-Type": "application/json" }
    });
    const data = await res.json();
    console.log("✅ [ÉXITO] Conexión a RaiseCloud Establecida:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.log("❌ [ERROR] Falló la conexión a RaiseCloud:", err.message);
  }
}

testLocalApi(); // <-- Cambia a testRaiseCloudApi() si prefieres probar la nube