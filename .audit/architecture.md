# 🏗️ Reporte de Auditoría de Arquitectura — Roamly

**Módulo:** Arquitectura, Diseño de Software y Modelado de Datos  
**Fecha:** 5 de Agosto de 2026

---

## 1. Defectos de Arquitectura Críticos (Critical Flaws)

### ARC-01: 🔴 Bug Severo de Cálculo de Fecha y Zona Horaria (`generateDayPlans`)
- **Severidad:** 🔴 CRÍTICO
- **Archivo afectado:** [`src/utils/dates.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/dates.ts#L15-L29)
- **Código Actual:**
```typescript
export function generateDayPlans(startDate: string, endDate: string): DayPlan[] {
  const days: DayPlan[] = []
  const current = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  while (current <= end) {
    days.push({
      id: generateId(),
      date: current.toISOString().slice(0, 10),
      activities: [],
    })
    current.setDate(current.getDate() + 1)
  }
  return days
}
```
- **Demostración de Fallo:**
  1. Supongamos un usuario en Madrid (UTC+2 / CEST) o Tokio (UTC+9).
  2. El usuario crea un viaje con `startDate = "2026-10-12"`.
  3. `new Date("2026-10-12T00:00:00")` interpreta las 00:00 horas locales.
  4. En UTC+2, las 00:00 locales equivalen a las `2026-10-11T22:00:00.000Z` UTC!
  5. `current.toISOString().slice(0, 10)` devuelve `"2026-10-11"`.
  6. **Resultado:** El Día 1 del viaje queda asignado al 11 de Octubre en lugar del 12 de Octubre.
- **Solución Recomendada:** Operar exclusivamente con cadenas YYYY-MM-DD o realizar la aritmética de fechas en tiempo UTC estricto:
```typescript
export function generateDayPlans(startDate: string, endDate: string): DayPlan[] {
  const days: DayPlan[] = []
  const [startY, startM, startD] = startDate.split('-').map(Number)
  const [endY, endM, endD] = endDate.split('-').map(Number)

  const current = new Date(Date.UTC(startY, startM - 1, startD))
  const end = new Date(Date.UTC(endY, endM - 1, endD))

  while (current <= end) {
    days.push({
      id: generateId(),
      date: current.toISOString().slice(0, 10),
      activities: [],
    })
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return days
}
```

---

## 2. Abstracción y Persistencia de Datos

### ARC-02: Acoplamiento Directo a `localStorage` y Límite de Almacenamiento
- **Severidad:** 🟠 ALTA
- **Archivos afectados:**
  - [`src/hooks/useLocalStorage.ts`](file:///Users/eduardotorres/Developer/Roamly/src/hooks/useLocalStorage.ts)
  - [`src/context/TripContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/TripContext.tsx#L70)
- **Problema:** Toda la lógica de datos de la aplicación depende rígidamente de `window.localStorage`.
  - `localStorage` es síncrono y bloquea el hilo principal de la UI en lecturas/escrituras.
  - Tiene una cuota fija de ~5 MB por origen. Si el usuario agrega múltiples itinerarios con imágenes codificadas o notas extensas, la llamada a `setItem` lanzará `QuotaExceededError`.
  - No existe capa de abstracción de repositorio (*Repository Pattern* / *Data Access Layer*), dificultando la migración futura a IndexedDB, Supabase o Firebase.
- **Solución Recomendada:** Introducir una interfaz de repositorio `TripRepository` que desacople la interfaz de usuario del mecanismo de almacenamiento.

---

## 3. Accesibilidad y Adaptabilidad Móvil (Cross-Platform)

### ARC-03: Incompatibilidad de Drag-and-Drop en Dispositivos Táctiles
- **Severidad:** 🟠 ALTA
- **Archivo afectado:** [`src/components/trip/ActivityItem.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/trip/ActivityItem.tsx#L82-L91)
- **Problema:** La reordenación de actividades utiliza eventos nativos HTML5 (`draggable`, `onDragStart`, `onDrop`).
  - La API de HTML5 Drag-and-Drop **no es compatible de forma nativa con eventos táctiles en navegadores móviles** (iOS Safari y Android Chrome). En pantallas táctiles, los usuarios no pueden arrastrar ni reordenar actividades.
  - Tampoco admite navegación por teclado (flechas arriba/abajo) para usuarios con tecnologías de asistencia.
- **Solución Recomendada:** Reemplazar el arrastre HTML5 nativo por una librería accesible y compatible con gestos táctiles como `@dnd-kit/core` o `framer-motion` Reorder.

---

## 4. Estructura de Contextos y Acoplamiento

### ARC-04: Acoplamiento Excesivo en `MapContext`
- **Severidad:** 🟡 MEDIA
- **Archivo afectado:** [`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx#L50-L140)
- **Problema:** `MapContext` concentra responsabilidades de UI (estado de expansión del mapa `mapExpanded`), selección de marcadores (`focusedMarkerId`), navegación geográfica (`flyToTarget`), y servicios de integración con Overpass API (`fetchNearbyPOIs`).
- **Solución Recomendada:** Desacoplar la gestión de servicios POI en un hook custom `usePOIService` o repositorio independiente, dejando a `MapContext` únicamente el control del estado visual del mapa.

---

## 5. Comparativa con Directrices del Proyecto (`CLAUDE.md`)

| Criterio en `CLAUDE.md` | Estado Actual | Observación de Auditoría |
| :--- | :---: | :--- |
| **"Secure by Default (.env)"** | ⚠️ Parcial | `VITE_UNSPLASH_ACCESS_KEY` se expone en el frontend sin servidor proxy. |
| **"Data Validation (Zod)"** | ❌ Faltante | No hay validación de esquemas en entradas ni almacenamiento. |
| **"Cross-Platform Excellence"** | ⚠️ Parcial | La dependencia de HTML5 Drag & Drop rompe en navegadores móviles nativos. |
| **"Theming / Dark Mode"** | ✅ Cumplido | Diseño oscuro glassmorphic consistente y atractivo. |
