# 🛡️ Reporte Completo de Auditoría de Seguridad — Roamly

**Módulo:** Seguridad de la Información, Inyección, XSS, Protección de API Keys, CORS, Rate Limiting y Sanitización  
**Fecha de Auditoría:** 24 de Agosto de 2026  
**Auditor:** Agentic AI Code Reviewer & Security Auditor  
**Repositorio:** [`Roamly`](file:///Users/eduardotorres/Developer/Roamly)  
**Alcance (Scope):** Todo el código fuente en `src/`, `api/`, `landing/` y configuraciones.

---

## 🎯 Resumen Ejecutivo de Seguridad

La evaluación de seguridad del repositorio **Roamly** confirma una postura defensiva sólida en frontend y edge proxy. Los vectores críticos comunes en SPAs (tales como exposición de secretos en bundles cliente mediante `VITE_` o inyecciones XSS vía `.ics`) están prevenidos. No obstante, se identifican áreas de mejora prioritarias en el **rate limiting del Edge Proxy** y la **validación de esquemas en tiempo de ejecución**.

---

## 📊 Matriz de Hallazgos de Seguridad por Severidad

| ID | Severidad | Área / Categoría | Archivo Afectado | Descripción Corta | Estado |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **SEC-01** | 🟠 HIGH | Rate Limiting Volátil | [`api/unsplash.ts:L37-L70`](file:///Users/eduardotorres/Developer/Roamly/api/unsplash.ts#L37-L70) | Rate limiter en memoria no compartido entre nodos Edge serverless | ⚠️ IDENTIFICADO |
| **SEC-02** | 🟡 MEDIUM | Persistencia en Texto Plano | [`TripRepository.ts:L66-L93`](file:///Users/eduardotorres/Developer/Roamly/src/repository/TripRepository.ts#L66-L93) | Datos de viaje en `localStorage` sin cifrado opcional | ⚠️ IDENTIFICADO |
| **SEC-03** | 🟡 MEDIUM | Inyección de Formato Markdown | [`itineraryMarkdown.ts:L28-L37`](file:///Users/eduardotorres/Developer/Roamly/src/utils/itineraryMarkdown.ts#L28-L37) | Caracteres especiales de Markdown sin escapar en exportación | ⚠️ IDENTIFICADO |
| **SEC-04** | 🟢 LOW | Límite de Tamaño de Archivo | [`CalendarImportModal.tsx:L123`](file:///Users/eduardotorres/Developer/Roamly/src/components/modals/CalendarImportModal.tsx#L123) | Ausencia de límite explícito de tamaño en carga de archivos `.ics` | ⚠️ IDENTIFICADO |
| **SEC-05** | 🟢 LOW | Configuración de CSP | [`index.html:L12-L15`](file:///Users/eduardotorres/Developer/Roamly/index.html#L12-L15) | Política estricta de `connect-src` ante proxies cross-origin | ⚠️ IDENTIFICADO |
| **SEC-06** | 🟢 LOW | Aislamiento de Secretos | [`api/unsplash.ts:L1-L15`](file:///Users/eduardotorres/Developer/Roamly/api/unsplash.ts#L1-L15) | `UNSPLASH_ACCESS_KEY` vive solo en el servidor edge (sin `VITE_`) | **RESUELTO ✅** |
| **SEC-07** | 🟢 LOW | Sanitización de Contenidos ICS | [`icsParser.ts:L241-L261`](file:///Users/eduardotorres/Developer/Roamly/src/utils/icsParser.ts#L241-L261) | Sanitización de HTML, scripts y esquemas peligrosos (`javascript:`, `data:`) | **RESUELTO ✅** |

---

## 🔍 Análisis Detallado de Hallazgos y Vulnerabilidades

### 1. 🟠 HIGH: SEC-01 — Rate Limiting en Memoria Volátil de Instancia Edge
- **Ubicación:** [`api/unsplash.ts:L37-L70, L246-L256`](file:///Users/eduardotorres/Developer/Roamly/api/unsplash.ts#L37-L70)
- **Problema:** `buckets` se gestiona en un `Map<string, { tokens: number; last: number }>` en memoria del proceso Edge. Dado que las funciones Edge se ejecutan de forma aislada y distribuida en cientos de servidores perimetrales, cada nodo mantiene su propio contador. Un atacante puede rotar conexiones o distribuir peticiones para consumir la cuota upstream de Unsplash sin ser frenado por el límite de 20 peticiones/minuto.
- **Impacto:** Posible denegación de servicio (DoS) por agotamiento de cuota de API upstream.
- **Remediación:** Utilizar un almacén distribuido (Upstash Redis, Vercel KV, o Cloudflare KV/Rate Limiting API) para centralizar el conteo de tokens.

---

### 2. 🟡 MEDIUM: SEC-02 — Persistencia en Texto Plano en `localStorage`
- **Ubicación:** [`src/repository/TripRepository.ts:L66-L93`](file:///Users/eduardotorres/Developer/Roamly/src/repository/TripRepository.ts#L66-L93)
- **Problema:** Todos los itinerarios (fechas, hoteles, códigos de vuelo, notas personales) se guardan en texto plano bajo `localStorage.getItem('wanderplan-trips')`.
- **Impacto:** Si bien no hay almacenamiento en servidores propios, cualquier script inyectado (por ejemplo, mediante extensiones maliciosas de navegador con permisos sobre el origen) puede leer la totalidad del historial de viajes del usuario.
- **Remediación:** Considerar una opción de cifrado simétrico en el cliente (Web Crypto API) para usuarios que deseen proteger notas con contraseña o PIN local.

---

### 3. 🟡 MEDIUM: SEC-03 — Inyección de Formato en Exportación de Markdown
- **Ubicación:** [`src/utils/itineraryMarkdown.ts:L28-L37`](file:///Users/eduardotorres/Developer/Roamly/src/utils/itineraryMarkdown.ts#L28-L37)
- **Problema:** Al generar el itinerario en Markdown (`generateItineraryMarkdown`), `activity.title`, `activity.notes` y `trip.destination` se interpolan directamente. Caracteres como `[` o `]` en títulos pueden romper el formato o inyectar enlaces engañosos al abrir el archivo en lectores de Markdown.
- **Remediación:** Escapar caracteres especiales de sintaxis Markdown (`[`, `]`, `(`, `)`) antes de concatenar.

---

### 4. 🟢 LOW: SEC-04 — Validación de Tamaño de Archivo en Importación de Calendario
- **Ubicación:** [`src/components/modals/CalendarImportModal.tsx:L123-L135`](file:///Users/eduardotorres/Developer/Roamly/src/components/modals/CalendarImportModal.tsx#L123-L135)
- **Problema:** Se lee el contenido del archivo con `await file.text()` sin validar `file.size`.
- **Remediación:** Agregar una validación simple `if (file.size > 5 * 1024 * 1024) throw Error(...)`.

---

## 🛡️ Controles de Seguridad Destacados (Buenas Prácticas)

1. **Aislamiento de Claves de API:** `UNSPLASH_ACCESS_KEY` se lee exclusivamente en el proxy Edge y nunca en el cliente.
2. **Sanitización de Archivos ICS:** [`icsParser.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/icsParser.ts#L241-L261) elimina etiquetas HTML, esquemas `javascript:`, `data:`, `file:`, `blob:`, bloqueando vectores XSS antes del parseo.
3. **Renderizado Seguro en React:** Ningún componente utiliza `dangerouslySetInnerHTML` con datos de usuario.
4. **Content Security Policy (CSP):** `index.html` cuenta con una CSP restrictiva que bloquea `object-src`, `unsafe-eval` en producción y restringe `connect-src` e `img-src`.
