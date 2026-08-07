# ⚡ Reporte de Auditoría de Rendimiento — Roamly

**Módulo:** Rendimiento, Bundle Size, Rate-Limiting y Optimizaciones UI  
**Fecha:** 7 de Agosto de 2026  
**Auditor:** Code Reviewer & Security Auditor Agent (`code-reviewer-auditor`)

---

## 🎯 Resumen de Hallazgos de Rendimiento

| ID | Severidad | Título / Área | Archivo Afectado | Estado |
| :--- | :---: | :--- | :--- | :---: |
| **PERF-01** | 🟠 ALTO | Bundle Monolítico JS Excede 500 kB | [`vite.config.ts`](file:///Users/eduardotorres/Developer/Roamly/vite.config.ts) | **RESUELTO ✅ (manualChunks)** |
| **PERF-02** | 🟠 ALTO | Violación de Rate-Limiting de Nominatim | [`src/utils/geocoding.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/geocoding.ts) | **RESUELTO ✅ (Queue & Cache)** |
| **PERF-03** | 🟡 MEDIO | Peticiones a Overpass API en Selección de Marcador | [`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx#L101) | PENDIENTE |
| **PERF-04** | 🟡 MEDIO | Re-renders en Cascada por Estado Monolítico | [`src/context/TripContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/TripContext.tsx#L194) | PENDIENTE |

---

## 🔬 Análisis Detallado de Rendimiento

### PERF-01: Fragmentación de Bundle con `manualChunks` (🟠 ALTO — RESUELTO ✅)

#### Diagnóstico Previo vs Estado Actual
- **Previo:** Todo el código ejecutable (React 19, React DOM, Leaflet, Radix UI, Lucide Icons) se empaquetaba en un único archivo JavaScript estático de ~515 kB.
- **Estado Actual:** ✅ **Resuelto**. Se configuró la división manual de fragmentos en [`vite.config.ts`](file:///Users/eduardotorres/Developer/Roamly/vite.config.ts#L27-L38):
```typescript
manualChunks(id: string) {
  if (!id.includes('node_modules')) return
  if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
    return 'vendor-react'
  }
  if (/node_modules\/(leaflet|react-leaflet|@react-leaflet)\//.test(id)) {
    return 'vendor-map'
  }
  if (/node_modules\/(@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)\//.test(id)) {
    return 'vendor-ui'
  }
}
```
#### Resultados del Build Verificados
- `dist/assets/index-*.js`: **67.74 kB** (gzip: 18.69 kB) — Código de la aplicación extremadamente ligero.
- `dist/assets/vendor-ui-*.js`: **69.28 kB** (gzip: 23.63 kB).
- `dist/assets/vendor-map-*.js`: **162.39 kB** (gzip: 47.89 kB).
- `dist/assets/vendor-react-*.js`: **220.08 kB** (gzip: 70.70 kB).
- Totalmente optimizado para descarga paralela y caché de larga duración en navegadores.

---

### PERF-02: Rate-Limiting Estricto y Caché para Geocodificación (🟠 ALTO — RESUELTO ✅)

#### Diagnóstico Previo vs Estado Actual
- **Previo:** `geocodeActivity` utilizaba un `setTimeout` arbitrario de 200 ms sin coordinar peticiones concurrentes entre componentes, violando el límite de 1 req/seg de Nominatim.
- **Estado Actual:** ✅ **Resuelto**. [`src/utils/geocoding.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/geocoding.ts#L40-L66) implementa una cola global síncrona `schedule()` que garantiza un espacio mínimo de 1000 ms (`MIN_REQUEST_INTERVAL_MS = 1000`) entre solicitudes HTTP salientes, y almacena hasta 500 resultados en una caché LRU en memoria.

---

### PERF-03: Optimización de Consultas Overpass API (🟡 MEDIO — PENDIENTE)

#### Diagnóstico
En [`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx#L101):
Al enfocar un marcador (`focusMarker`), se invoca `fetchNearbyPOIs`. Si el usuario hace clic rápidamente entre varios marcadores en el mapa, se gatillan múltiples peticiones HTTP POST a Overpass API compitiendo entre sí.
- **Remediación Recomendada:** Implementar *debouncing* y memoria caché de POIs ordenables por coordenadas.

---

### PERF-04: Re-renderizados en Cascada de Contextos (🟡 MEDIO — PENDIENTE)

#### Diagnóstico
En [`src/context/TripContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/TripContext.tsx) y [`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx):
Los valores provistos por los Context Providers incluyen tanto los datos de estado como las funciones de mutación en un único objeto. Cada actualización re-renderiza todos los componentes suscritos.
- **Remediación Recomendada:** Memorizar las funciones de mutación o desacoplar los estados de UI efímeros.
