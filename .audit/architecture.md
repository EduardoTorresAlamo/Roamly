# 🏗️ Reporte Completo de Auditoría de Arquitectura — Roamly

**Módulo:** Arquitectura de Software, Patrones de Diseño, Desacoplamiento, Manejo de Estado y React 19  
**Fecha de Auditoría:** 24 de Agosto de 2026  
**Auditor:** Agentic AI Code Reviewer & Software Architect  
**Repositorio:** [`Roamly`](file:///Users/eduardotorres/Developer/Roamly)

---

## 🎯 Resumen Ejecutivo de Arquitectura

El diseño arquitectónico de **Roamly** destaca por una clara separación de responsabilidades:
- **Patrón Repositorio (`TripRepository`)**: Aísla la persistencia de datos de los componentes React.
- **División de Contextos (`TripStateContext` vs `TripDispatchContext`)**: Garantiza estabilidad referencial en mutaciones.
- **Manejo de Fechas Anclado en UTC (`dates.ts`)**: Previene desfases de fecha y problemas de DST.
- **Servicios Aislados (`usePOIService`)**: Gestiona debouncing y descarte de respuestas desordenadas en Overpass API.

Sin embargo, se identifican oportunidades clave de desacoplamiento en **`MapContext`** y en la **interfaz del repositorio**.

---

## 📊 Matriz de Hallazgos de Arquitectura por Severidad

| ID | Severidad | Área / Componente | Archivo Afectado | Descripción Corta | Estado |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **ARCH-01** | 🟠 HIGH | Monolito de Contexto | [`MapContext.tsx:L40-L130`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx#L40-L130) | `MapContext` monolítico fuerza re-renders innecesarios en `AppShell` y `Dashboard` | ⚠️ IDENTIFICADO |
| **ARCH-02** | 🟡 MEDIUM | Persistencia Sincrónica | [`TripRepository.ts:L13-L22`](file:///Users/eduardotorres/Developer/Roamly/src/repository/TripRepository.ts#L13-L22) | Métodos síncronos en interfaz `TripRepository` dificultan migración a bases de datos asíncronas | ⚠️ IDENTIFICADO |
| **ARCH-03** | 🟡 MEDIUM | Acoplamiento en Modales | [`AddTripModal.tsx`, `CalendarImportModal.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/modals/) | Orquestación de red, geocodificación y parsing dentro de componentes UI | ⚠️ IDENTIFICADO |
| **ARCH-04** | 🟢 LOW | Convivencia Tailwind v3/v4 | [`package.json` vs `landing/package.json`](file:///Users/eduardotorres/Developer/Roamly/package.json) | Monorepo con dos versiones y sistemas de configuración de Tailwind diferentes | ⚠️ IDENTIFICADO |
| **ARCH-05** | 🟢 LOW | Consistencia UTC | [`dates.ts:L15-L55`](file:///Users/eduardotorres/Developer/Roamly/src/utils/dates.ts#L15-L55) | Operaciones de fecha ancladas 100% en UTC | **RESUELTO ✅** |
| **ARCH-06** | 🟢 LOW | Split de Trip Context | [`useTrips.ts:L11-L26`](file:///Users/eduardotorres/Developer/Roamly/src/hooks/useTrips.ts#L11-L26) | Segregación de State y Dispatch para mutaciones eficientes | **RESUELTO ✅** |

---

## 🔍 Análisis Detallado de Decisiones Arquitectónicas

### 1. 🟠 HIGH: ARCH-01 — Monolito de Estado en `MapContext`
- **Problema:** `MapContext` expone un único contexto que mezcla propiedades de UI (`mapExpanded`), pins del mapa (`markers`), objetivo de vuelo (`flyToTarget`), y resultados de búsqueda de POIs de Overpass (`recommendations`, `isLoadingRecs`).
- **Consecuencia:** Cuando el usuario interactúa con un marcador de actividad en el mapa y se dispara `searchNearbyPOIs`, el cambio en `isLoadingRecs` y `recommendations` genera un nuevo objeto `value` en `MapContext.Provider`. Esto provoca el re-renderizado de `MacOSMenuBar`, `AppShell` y `Dashboard`, a pesar de que estos componentes no consumen recomendaciones POI.
- **Solución Recomendada:** Dividir `MapContext` en sub-contextos o mover las recomendaciones POI al componente `NearbyPanel` mediante el hook `usePOIService`.

---

### 2. 🟡 MEDIUM: ARCH-02 — Interfaz Síncrona en `TripRepository`
- **Problema:** La interfaz `TripRepository` actual declara:
  ```typescript
  export interface TripRepository {
    getAll(): Trip[]
    getById(id: string): Trip | undefined
    save(trip: Trip): void
    delete(id: string): void
  }
  ```
- **Consecuencia:** Aunque funciona de forma directa para `localStorage`, cualquier backend remoto (Supabase, Firebase, Cloudflare D1) o motor asíncrono cliente (IndexedDB / OPFS SQLite) requerirá que estos métodos devuelvan `Promise<Trip[]>`, `Promise<void>`, etc.
- **Solución Recomendada:** Extender o migrar la abstracción a una interfaz `AsyncTripRepository` con soporte para React 19 `use()` o React Query / SWR.

---

### 3. 🟡 MEDIUM: ARCH-03 — Densidad de Lógica en Modales de Entrada de Datos
- **Problema:** `AddTripModal.tsx` (~260 líneas) y `CalendarImportModal.tsx` (~390 líneas) contienen lógica de abort controllers, debounce timers, llamadas de geocodificación y mapeo de formatos ICS mezclados con JSX de Radix UI.
- **Solución Recomendada:** Extraer custom hooks especializados (`useTripForm`, `useCalendarImport`) para aislar la lógica de presentación del flujo de datos asíncrono.
