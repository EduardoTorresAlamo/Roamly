# 🔍 FULL REVIEW — Resumen Ejecutivo de Auditoría de Roamly

**Proyecto:** Roamly (`~/Developer/Roamly`)  
**Stack:** React 19.2, TypeScript 6.0, Vite 8, Tailwind CSS v3/v4, Leaflet / React-Leaflet, Radix UI, Astro 7 (Landing)  
**Fecha:** 24 de Agosto de 2026  
**Alcance (Scope):** Código Fuente Completo (`src/`, `api/`, `landing/`, tooling y pruebas)  
**Severidad Real:** `CRITICAL` | `HIGH` | `MEDIUM` | `LOW`  

---

## 📊 Matriz Consolidada de Severidades

| Dimensión Evaluada | CRITICAL 🔴 | HIGH 🟠 | MEDIUM 🟡 | LOW 🟢 | Total | Estado General |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1. 🔒 **Seguridad** | 0 | 1 | 2 | 2 | **5** | 🟡 Revisión |
| 2. 🐛 **Bugs y Lógica** | 0 | 0 | 3 | 2 | **5** | 🟢 Estable |
| 3. 📐 **Arquitectura** | 0 | 1 | 2 | 1 | **4** | 🟡 Revisión |
| 4. ⚡ **Rendimiento** | 0 | 0 | 1 | 2 | **3** | 🟢 Óptimo |
| 5. 🧹 **Dead Code / Smells** | 0 | 0 | 0 | 3 | **3** | 🟢 Bueno |
| 6. 🗄️ **Schema / Persistencia** | 0 | 1 | 1 | 1 | **3** | 🟡 Revisión |
| **TOTAL CONSOLIDADO** | **0** | **3** | **9** | **11** | **23** | 🟡 **SALUDABLE CON MEJORAS** |

---

## 🚦 Línea Base de Estado del Proyecto

- **Pruebas Automatizadas (`vitest run`):** 🟢 **58/58 passed (100%)** en 5 suites (`dates`, `geocoding`, `icsExport`, `icsParser`, `repository`).
- **Linter (`eslint .`):** 🟡 **1 warning** (`react-hooks/exhaustive-deps` en [`src/pages/TripDetail.tsx:L80`](file:///Users/eduardotorres/Developer/Roamly/src/pages/TripDetail.tsx#L80)).
- **Compilador TypeScript (`tsc -b`):** 🟢 **0 errores de tipos** en modo estricto.
- **Build de Producción (`vite build` + `astro build`):** 🟢 **Compilación exitosa** tanto para la SPA como para la Landing en Astro.

---

## 🎯 Hallazgos de Alta Prioridad (HIGH 🟠)

### 🟠 [HIGH] SEC-01: Rate Limiter y Caché en Memoria Volátil en Proxy Edge
- **Ubicación:** [`api/unsplash.ts:L37-L70, L246-L256`](file:///Users/eduardotorres/Developer/Roamly/api/unsplash.ts#L37-L70)
- **Problema:** Los contadores de *token bucket* (`buckets`) y la caché (`cache`) residen en memoria dentro del worker isolate. En plataformas Edge (Vercel Edge / Cloudflare Workers / Netlify), las instancias son efímeras y no comparten memoria entre regiones. Un atacante puede distribuir peticiones entre nodos para eludir el límite de 20 req/min y agotar la cuota upstream de `UNSPLASH_ACCESS_KEY`.
- **Acción:** Conectar un almacén distribuido para control de tasa (ej. Upstash Redis / Vercel KV / Cloudflare Rate Limiting).

### 🟠 [HIGH] ARCH-01: Re-renders Innecesarios por Monolito de Estado en `MapContext`
- **Ubicación:** [`src/context/MapContext.tsx:L40-L130`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx#L40-L130)
- **Problema:** `MapContext` agrupa en una única interfaz reactiva el estado de marcadores, animación de vuelo (`flyToTarget`), estado visual (`mapExpanded`) y las recomendaciones de Overpass (`recommendations`, `isLoadingRecs`). Cualquier búsqueda de POIs re-renderiza componentes superiores no relacionados como `MacOSMenuBar`, `Dashboard` y `AppShell`.
- **Acción:** Dividir `MapContext` en sub-contextos de UI (`MapUIContext`), Acciones (`MapDispatchContext`) y POIs (`MapPOIContext`).

### 🟠 [HIGH] SCH-01: Falta de Validación de Esquema en Tiempo de Ejecución en `localStorage`
- **Ubicación:** [`src/repository/TripRepository.ts:L78-L85`](file:///Users/eduardotorres/Developer/Roamly/src/repository/TripRepository.ts#L78-L85)
- **Problema:** `read()` ejecuta `JSON.parse(raw) as Trip[]` mediante un type-cast estático. Si los datos almacenados carecen de campos críticos (ej. `days` no es un array o está corrupto), el fallo se producirá aguas abajo durante el renderizado en React.
- **Acción:** Añadir una función de type-guard liviana (`isValidTripArray`) antes de devolver los datos.

---

## 🟡 Hallazgos de Media Prioridad (MEDIUM 🟡)

1. **BUG-01 (MEDIUM):** Advertencia de linter `react-hooks/exhaustive-deps` y sincronización redundante de `selectedDayId` en [`src/pages/TripDetail.tsx:L73-L92`](file:///Users/eduardotorres/Developer/Roamly/src/pages/TripDetail.tsx#L73-L92).
2. **BUG-02 (MEDIUM):** Falsy check defectuoso en `if (!result.lat || !result.lon)` en [`src/utils/destinationImages.ts:L97`](file:///Users/eduardotorres/Developer/Roamly/src/utils/destinationImages.ts#L97) que falla en coordenadas 0 (Ecuador/Meridiano).
3. **BUG-03 (MEDIUM):** Ambigüedad semántica entre eventos a medianoche ("00:00") y actividades sin hora en [`src/types/index.ts`](file:///Users/eduardotorres/Developer/Roamly/src/types/index.ts) y [`src/utils/icsExport.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/icsExport.ts).
4. **SEC-02 (MEDIUM):** Almacenamiento en texto plano en `localStorage` sin soporte de cifrado opcional para datos sensibles de viaje.
5. **SEC-03 (MEDIUM):** Ausencia de escapado de caracteres Markdown en [`src/utils/itineraryMarkdown.ts:L28-L37`](file:///Users/eduardotorres/Developer/Roamly/src/utils/itineraryMarkdown.ts#L28-L37).
6. **ARCH-02 (MEDIUM):** Interfaz síncrona en `TripRepository` que dificulta la migración directa a bases de datos asíncronas remotas (Supabase/IndexedDB).
7. **ARCH-03 (MEDIUM):** Acoplamiento de lógica de red, debouncing y abort controllers dentro de componentes visuales de modales.
8. **PERF-01 (MEDIUM):** Recálculo sin memoización en `filteredTrips` ([`Dashboard.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/pages/Dashboard.tsx#L135)) y cálculo de gradientes en [`TripCard.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/dashboard/TripCard.tsx#L47).
9. **SCH-02 (MEDIUM):** Ausencia de campo de versionado de esquema (`schemaVersion: 1`) para migraciones futuras.

---

## 🟢 Hallazgos de Baja Prioridad y Deuda Técnica (LOW 🟢)

1. **SEC-04 (LOW):** Falta de validación de tamaño máximo de archivo (< 5 MB) en [`CalendarImportModal.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/modals/CalendarImportModal.tsx).
2. **SEC-05 (LOW):** Advertencia de CSP en `connect-src` para despliegues con proxy Unsplash cross-domain.
3. **BUG-04 (LOW):** Manejo silencioso en bloques `catch` de portapapeles y exportación en [`TripDetail.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/pages/TripDetail.tsx).
4. **BUG-05 (LOW):** Posible duplicación de query params al concatenar `&w=1920&q=85` en [`api/unsplash.ts`](file:///Users/eduardotorres/Developer/Roamly/api/unsplash.ts).
5. **ARCH-04 (LOW):** Convivencia monorepo de Tailwind v3 (SPA) y Tailwind v4 (Landing).
6. **PERF-02 (LOW):** Micro-optimización de comprobación de fechas en `CalendarWidget` en [`Dashboard.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/pages/Dashboard.tsx).
7. **PERF-03 (LOW):** Falta de virtualización en listas masivas de POIs o itinerarios muy extensos.
8. **DEAD-01 (LOW):** Función exportada huérfana `getDayTabLabel` en [`src/utils/dates.ts:L119`](file:///Users/eduardotorres/Developer/Roamly/src/utils/dates.ts#L119).
9. **DEAD-02 (LOW):** Tipado `@types/leaflet` ubicado en `dependencies` en lugar de `devDependencies` en [`package.json`](file:///Users/eduardotorres/Developer/Roamly/package.json).
10. **DEAD-03 (LOW):** Duplicación de tipos entre `DestinationImage` (`api/unsplash.ts`) y `UnsplashResult` (`src/utils/destinationImages.ts`).
11. **SCH-03 (LOW):** Clave de persistencia histórica `wanderplan-trips` mantenida por retrocompatibilidad.

---

*Para el desglose técnico detallado, diagramas y soluciones paso a paso, consultar [.audit/FULL_AUDIT_REPORT.md](file:///Users/eduardotorres/Developer/Roamly/.audit/FULL_AUDIT_REPORT.md).*
