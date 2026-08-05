# 💎 Reporte de Auditoría de Calidad de Código y DX — Roamly

**Módulo:** Calidad de Código, Linter, Pruebas Automatizadas y Mantenibilidad  
**Fecha:** 5 de Agosto de 2026

---

## 1. Integración Continua y Mantenibilidad del Linter

### QUAL-01: Buenas Prácticas de Exportación en React y Fast Refresh
- **Severidad:** 🟡 MEDIA / DX
- **Archivos afectados:**
  - [`src/components/ui/button.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/ui/button.tsx#L19) (Exporta `buttonVariants` junto al componente `Button`).
  - [`src/context/MapContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/MapContext.tsx#L146) (Exporta `useMapContext` junto a `MapProvider`).
  - [`src/context/TripContext.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/context/TripContext.tsx#L207) (Exporta `useTripContext` junto a `TripProvider`).
- **Análisis:** Aunque `npm run lint` compila actualmente sin errores gracias al pragmatismo de la configuración de ESLint 9, mezclar utilidades/hooks con componentes React en el mismo archivo dificulta el *Hot Module Replacement* (HMR) limpio durante el desarrollo.
- **Solución Recomendada:**
  1. Para `button.tsx`: Extraer `buttonVariants` a un archivo de estilos/variantes o sub-modulo si es reutilizado.
  2. Para Hooks de Contexto: Separar los hooks custom (`useMapContext`, `useTripContext`) en sus propios archivos de hook bajo `src/hooks/`.

---

## 2. Cobertura de Pruebas y Automatización (Test Coverage)

### QUAL-02: Cobertura de Pruebas Nula (0% Unit / Integration Tests)
- **Severidad:** 🟠 ALTA
- **Estado Actual:** El repositorio **no cuenta con ningún entorno de pruebas configurado** (sin Vitest, Jest o Testing Library en `package.json`).
- **Riesgo:** Alta fragilidad en refactorizaciones. Funciones críticas de parsing y lógica de negocios carecen de validación automatizada:
  - `parseICS` y `groupEventsIntoTrip` ([`src/utils/icsParser.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/icsParser.ts)).
  - `generateDayPlans` y `formatDateRange` ([`src/utils/dates.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/dates.ts)).
  - `haversineDistance` y `tagToCategory` ([`src/utils/overpass.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/overpass.ts)).
  - `generateItineraryMarkdown` ([`src/pages/TripDetail.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/pages/TripDetail.tsx)).
- **Solución Recomendada:** Instalar y configurar **Vitest** y `@testing-library/react` para cubrir utilidades puras e interacciones clave de componentes.

---

## 3. Manejo de Fallos y Resiliencia UI

### QUAL-03: Ausencia de Error Boundaries
- **Severidad:** 🟡 MEDIA
- **Archivo afectado:** [`src/App.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/App.tsx)
- **Problema:** No existe un componente `<ErrorBoundary>` en la raíz de la aplicación.
- **Riesgo:** Si ocurre una excepción inesperada durante la renderización del mapa de Leaflet, el cálculo de fechas o al iterar itinerarios corrompidos, la pantalla entera se vuelve en blanco (*white screen of death*), bloqueando al usuario sin mensaje de recuperación.
- **Solución Recomendada:** Envolver las rutas principales en un `ErrorBoundary` con pantalla de rescate (*fallback UI*) y opción de reiniciar el estado local.

---

## 4. Inconsistencias de Estilo y Código Duplicado

### QUAL-04: Data Estática Embebida en Código de Utilidad
- **Severidad:** 🔵 BAJA
- **Archivo afectado:** [`src/utils/destinationImages.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/destinationImages.ts#L33-L172)
- **Problema:** Más de 140 líneas de código contienen un objeto estático `CURATED` con coordenadas e imágenes fijas para 20 destinos populares.
- **Solución:** Mover los datos estáticos a un archivo JSON independiente (`src/data/curatedDestinations.json`) para mantener los archivos de utilidades limpios y enfocados en la lógica.

### QUAL-05: Conflicto de Variantes en `button.tsx` vs Diseño Glassmorphism
- **Severidad:** 🔵 BAJA
- **Archivo afectado:** [`src/components/ui/button.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/ui/button.tsx#L19-L22)
- **Problema:** Las variantes de `buttonVariants` (como `outline: 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-700'`) presuponen un tema claro (*light mode*), mientras que la aplicación utiliza un tema oscuro *glassmorphic*. Si un desarrollador usa `<Button variant="outline">`, el botón renderiza texto oscuro sobre fondo blanco roto desentonando con la estética general.
