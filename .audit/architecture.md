# 🏗️ Reporte de Auditoría de Arquitectura — Roamly

**Módulo:** Arquitectura de Software, Modelado de Datos, Patrones de Diseño, Manejo de Tiempo y Accesibilidad  
**Fecha:** 7 de Agosto de 2026  
**Auditor:** Code Reviewer & Security Auditor Agent (`code-reviewer-auditor`)

---

## 🎯 Resumen de Hallazgos de Arquitectura

| ID | Severidad | Título / Área | Archivo Afectado | Estado |
| :--- | :---: | :--- | :--- | :---: |
| **ARC-01** | 🔴 CRÍTICO | Bug de Zona Horaria UTC en Generación de Días | [`src/utils/dates.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/dates.ts) | **RESUELTO ✅ (Date.UTC)** |
| **ARC-02** | 🟠 ALTO | Incompatibilidad de Drag & Drop en Pantallas Táctiles | [`src/components/trip/ActivityItem.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/trip/ActivityItem.tsx) | **RESUELTO ✅ (Touch Drag)** |
| **ARC-03** | 🟠 ALTO | Acoplamiento Directo de Capa de Datos a `localStorage` | [`src/repository/TripRepository.ts`](file:///Users/eduardotorres/Developer/Roamly/src/repository/TripRepository.ts) | **RESUELTO ✅ (Repository Pattern)** |
| **ARC-04** | 🟡 MEDIO | Mezcla de Responsabilidades en `MapContext` | [`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx) | PENDIENTE |

---

## 🏗️ Análisis Detallado de Arquitectura e Integración Reciente

### ARC-03: Implementación del Patrón Repository (`TripRepository`) (🟠 ALTO — RESUELTO ✅)

#### Diagnóstico Previo
Previamente, `TripContext.tsx` dependía rígidamente del hook custom `useLocalStorage`, mezclando la gestión de estado de React con llamadas directas a la API global `window.localStorage`. Esto impedía inyectar fuentes de datos alternativas (ej. IndexedDB, in-memory para tests, Supabase) y dificultaba las pruebas unitarias aisladas.

#### Estado Actual e Integración Verificada
✅ **Resuelto**. Se creó una abstracción de persistencia completa y limpia dividida en dos componentes principales:

1. **Contrato de Interfaz (`TripRepository.ts`):**
   ```typescript
   export interface TripRepository {
     getAll(): Trip[]
     getById(id: string): Trip | undefined
     save(trip: Trip): void
     delete(id: string): void
   }
   ```
2. **Implementación concreta `LocalStorageTripRepository`:**
   - Cumple estrictamente con la regla `erasableSyntaxOnly` de TypeScript (campos declarados explícitamente sin propiedades de parámetro de constructor).
   - Maneja fallos suaves (`try/catch`) en lectura y escritura contra `Storage` configurable (por defecto `window.localStorage`).
   - Implementa `save` como una operación de *upsert* idempotente que preserva el orden de inserción.

3. **Inyección de Dependencias vía `TripRepositoryProvider.tsx` y `TripContext.tsx`:**
   - `TripRepositoryProvider` memoriza el repositorio utilizando `useMemo`.
   - `TripProvider` acepta opcionalmente un `repository` por props o lo obtiene de `useTripRepository()`, sembrando el estado inicial mediante `useState(() => repo.getAll())`.
   - Mutaciones (`addTrip`, `addTripFull`, `deleteTrip`, `addActivity`, `deleteActivity`, `moveActivity`) invocan métodos idempotentes del repositorio (`repo.save` / `repo.delete` / `persistTrip`) dentro de actualizadores de estado funcionales.

4. **Jerarquía de Providers en `src/main.tsx`:**
   ```tsx
   <StrictMode>
     <BrowserRouter>
       <TripRepositoryProvider>
         <TripProvider>
           <MapProvider>
             <App />
           </MapProvider>
         </TripProvider>
       </TripRepositoryProvider>
     </BrowserRouter>
   </StrictMode>
   ```
   La jerarquía respeta estrictamente las dependencias: `TripRepositoryProvider` provee el backend de datos que consume `TripProvider`.

---

### ARC-01: Corrección Definitiva del Bug de Zona Horaria (🔴 CRÍTICO — RESUELTO ✅)

#### Diagnóstico y Demostración
✅ **Resuelto**. [`src/utils/dates.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/dates.ts#L15-L55) desacopló la manipulación de fechas del huso local mediante funciones dedicadas en tiempo UTC estricto:
```typescript
function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
```
Todas las fechas de los itinerarios son inmutables independientemente de la ubicación geográfica del usuario.

---

### ARC-02: Soporte Multidispositivo para Reordenamiento Drag & Drop (🟠 ALTO — RESUELTO ✅)

#### Diagnóstico y Estado Actual
✅ **Resuelto**. [`src/components/trip/ActivityItem.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/trip/ActivityItem.tsx#L76-L157) incorpora un controlador de gestos táctiles síncrono sobre el tirador de arrastre (`GripVertical`), resolviendo el elemento subyacente mediante `document.elementFromPoint`, permitiendo reordenar actividades fluidamente en móviles.

---

### ARC-04: Separación de Funcionalidades en `MapContext` (🟡 MEDIO — PENDIENTE)

#### Diagnóstico
[`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx) acopla la gestión del estado visual del mapa con llamadas de red directas a la API de Overpass (`fetchNearbyPOIs`).
- **Remediación Recomendada:** Extraer las consultas de Overpass a un hook custom `usePOIService`.
