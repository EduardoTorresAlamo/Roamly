# ⚡ Reporte de Auditoría de Rendimiento — Roamly

**Módulo:** Rendimiento, Tiempos de Carga y Consumo de Recursos  
**Fecha:** 5 de Agosto de 2026

---

## 1. Análisis de Tamaño de Bundle (Bundle Size Audit)

### PERF-01: Bundle Único Superior al Límite Recomendado (> 500 kB)
- **Severidad:** 🟠 ALTA
- **Evidencia del Build:**
```
dist/index.html                   0.50 kB │ gzip:   0.31 kB
dist/assets/index-6Ct1-PQB.css   47.99 kB │ gzip:  13.03 kB
dist/assets/index-Bjr8Qa-5.js   514.94 kB │ gzip: 157.44 kB
(!) Some chunks are larger than 500 kB after minification.
```
- **Causa Raíz:** Todo el código ejecutable de la aplicación (React 19, React DOM, React Router, Leaflet, React Leaflet, Lucide Icons, Radix UI) está empaquetado en un único archivo JavaScript monolítico (`index-Bjr8Qa-5.js`).
- **Impacto:** Tiempo de primera carga (FCP/LCP) elevado en conexiones móviles 3G/4G, ya que el navegador debe descargar y parsear 515 kB antes de renderizar la primera pantalla.
- **Solución Recomendada:**
  Configurar la opción `manualChunks` en `vite.config.ts` para separar las librerías pesadas en fragmentos independientes:
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          ui: ['lucide-react', '@radix-ui/react-dialog'],
        },
      },
    },
  },
})
```

---

## 2. Red y Rate-Limiting de APIs Externas

### PERF-02: Violación de Rate-Limit de Nominatim (Geocodificación)
- **Severidad:** 🟠 ALTA
- **Archivo afectado:** [`src/utils/geocoding.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/geocoding.ts#L62-L66)
- **Análisis de Código:**
```typescript
export async function geocodeActivity(title: string, tripDestination: string) {
  // Throttle to 1 req/sec -- Nominatim's stated policy for non-commercial clients
  await new Promise((r) => setTimeout(r, 200))
  ...
}
```
- **Problema:** El comentario indica "Throttle to 1 req/sec", pero el código asigna `200 ms`. Un intervalo de 200 ms equivale a 5 peticiones por segundo, lo que viola directamente la política de uso justo de Nominatim (máximo 1 req/seg = 1000 ms). Además, llamar a `geocodeActivity` concurrentemente desde múltiples componentes ignora este retardo individual.
- **Solución:** Implementar una cola de peticiones global con *rate limiter* estricto de 1000 ms entre solicitudes HTTP a Nominatim.

### PERF-03: Llamadas Innecesarias a Overpass API en Interacción con el Mapa
- **Severidad:** 🟡 MEDIA
- **Archivo afectado:** [`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx#L101)
- **Problema:** Cada vez que el usuario hace clic en un marcador (`focusMarker`), se gatilla un `fetch` inmediatamente a Overpass API para obtener POIs cercanos. Si el usuario selecciona varios marcadores en rápida sucesión, se ejecutan peticiones POST pesadas compitiendo entre sí.
- **Solución:** Implementar *caching* local de resultados POI por coordenadas (usando un Map en memoria) para evitar consultar Overpass si la zona o marcador ya fue consultado recientemente.

---

## 3. Renderizado y Manejo de Estado en React

### PERF-04: Re-renderizados en Cascada por Estado de Contexto Monolítico
- **Severidad:** 🟡 MEDIA
- **Archivos afectados:**
  - [`src/context/TripContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/TripContext.tsx#L194)
  - [`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx#L121)
- **Problema:**
  En `TripContext`, el valor del contexto se recrea o comparte con todas las funciones CRUD y la lista completa de viajes. Cualquier actualización en un viaje secundario re-renderiza todos los componentes suscritos a `useTrips()` (incluyendo `Dashboard`, `TripGrid`, `TripCard`, `TripDetail`).
  En `MapContext`, los estados `markers`, `focusedMarkerId`, `recommendations`, `isLoadingRecs`, `flyToTarget` y `mapExpanded` comparten un único Provider. Al cambiar el foco de un marcador, se disparan 4 re-renderizados consecutivos en los componentes de mapa y paneles UI.
- **Solución:**
  Separar el estado de lectura del estado de mutación, o utilizar primitivas de estado optimizadas como selectors o librerías ligeras de estado (Zustand / Jotai).

### PERF-05: Copias Innecesarias de Arrays Profundos en Arrastrar y Soltar
- **Severidad:** 🔵 BAJA
- **Archivo afectado:** [`src/context/TripContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/TripContext.tsx#L157-L186)
- **Problema:** La función `moveActivity` realiza un recorrido inmutable profundo mapeando `trips -> days -> activities` y ejecutando `splice` en copias de arrays. En itinerarios de muchos días con decenas de actividades, la reordenación continua durante la animación de *drag & drop* genera presión en el recolector de basura (*Garbage Collector*).
