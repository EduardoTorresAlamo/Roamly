# 📋 Roamly — Full Review & Technical Audit Report

**Proyecto:** Roamly (`/Users/eduardotorres/Developer/Roamly`)  
**Fecha:** 7 de Agosto de 2026  
**Auditor:** Agentic AI Code Reviewer & Systems Architect  
**Estado General:** 🟢 **Sólido y listo para producción MVP (9.3 / 10)**

---

## 📑 Tabla de Contenidos
1. [🔒 1. Security Issues (Problemas de Seguridad)](#-1-security-issues-problemas-de-seguridad)
2. [💡 2. Nice-to-haves (Nuevas Funcionalidades Sugeridas)](#-2-nice-to-haves-nuevas-funcionalidades-sugeridas)
3. [🚀 3. Future Work (Tech Debt, Refactors y Hoja de Ruta)](#-3-future-work-tech-debt-refactors-y-hoja-de-ruta)
4. [📊 Resumen Ejecutivo y Conclusión](#-resumen-ejecutivo-y-conclusión)

---

## 🔒 1. Security Issues (Problemas de Seguridad)

### 🔴 Hallazgos Pendientes y Riesgos Detectados

#### 1.1. Sanitización de Inyección Markdown / HTML en Exportación e Importación ICS
- **Ubicación:** `src/utils/icsParser.ts` y `src/pages/TripDetail.tsx` (`generateItineraryMarkdown`)
- **Descripción:** Aunque `sanitizeDescription` remueve etiquetas HTML básicas e hipervínculos `javascript:`, al generar la exportación en Markdown o clipboard en `TripDetail.tsx`, las notas y títulos cargados manualmente o mediante archivos `.ics` externos se concatenan directamente.
- **Riesgo:** Si un usuario importa un calendario `.ics` malicioso proveniente de un tercero o sincronización externa con descripciones formateadas que contengan payloads de markdown malicioso, HTML incrustado o enlaces con esquemas no estándar (`data:text/html`), podría ejecutarse o desconfigurar visores de Markdown externos al compartir itinerarios.
- **Remediación:**
  - Aplicar `DOMPurify` o una librería de sanitización estricta antes de renderizar Markdown o generar exportaciones de texto plano.
  - Escapar explícitamente caracteres de control de Markdown (`[`, `]`, `(`, `)`, `*`, `_`) en campos introducidos por el usuario como `title` y `notes`.

#### 1.2. Falta de Restricción de Origen (CORS) y Rate Limiting en Edge Proxy de Unsplash
- **Ubicación:** `api/unsplash.ts`
- **Descripción:** La función Edge Proxy enmascara adecuadamente la clave `UNSPLASH_ACCESS_KEY` para que no se filtre en el bundle de cliente en el navegador. Sin embargo, no valida el encabezado `Origin` o `Referer` de las peticiones entrantes.
- **Riesgo:** Cualquier atacante que descubra la URL del endpoint proxy (`/api/unsplash`) podría utilizar la API Key del proyecto de manera arbitraria desde orígenes externos, consumiendo la cuota mensual de peticiones de Unsplash.
- **Remediación:**
  - Verificar el encabezado `Origin` en `api/unsplash.ts` para permitir únicamente peticiones originadas desde el dominio oficial de Roamly (`https://roamly.app` o subdominios autorizados).
  - Implementar rate-limiting por IP en la capa Vercel / Netlify Edge functions.

#### 1.3. Integridad y Validación de Esquemas en Persistencia Local (`localStorage`)
- **Ubicación:** `src/repository/TripRepository.ts`
- **Descripción:** La clase `LocalStorageTripRepository` atrapa excepciones de `JSON.parse` mediante un bloque `try/catch` para evitar fallos catastróficos. Sin embargo, no valida que los objetos recuperados cumplan con la estructura exacta de la interfaz `Trip` mediante una validación de esquemas en tiempo de ejecución (p. ej. con `Zod`).
- **Riesgo:** Si una versión anterior de los datos almacenados en el navegador del usuario carece de ciertas propiedades obligatorias (como `days`, `activities` o `lat`/`lon`), la aplicación puede sufrir un runtime crash (`TypeError: undefined is not iterable`) al renderizar la UI.
- **Remediación:**
  - Utilizar `zod` para parsear y validar el objeto `Trip` deserializado desde `localStorage`.
  - Aplicar una función de migración de esquema si los datos guardados corresponden a una versión obsoleta.

#### 1.4. Política de Contenido y Sanitización en Nominatim / Leaflet Maps
- **Ubicación:** `src/utils/geocoding.ts`
- **Descripción:** Se incluye la cabecera `User-Agent: RoamlyTravelApp/1.0` requerida por las políticas de OpenStreetMap/Nominatim. Sin embargo, las cadenas de respuesta de búsqueda de lugares se insertan directamente en el Popup del mapa sin codificación HTML cuando Leaflet las procesa.
- **Remediación:** Asegurar que todos los strings insertados en popups de Leaflet (`L.popup().setContent(...)`) utilicen `textContent` o pasen por sanitización de entidades HTML.

---

## 💡 2. Nice-to-haves (Nuevas Funcionalidades Sugeridas)

### 🌟 Funcionalidades para Elevar la Experiencia del Usuario (UX/DX)

1. **✈️ Exportación Directa a Calendario (.ics / Google Calendar)**
   - *Actualmente:* Roamly puede **importar** archivos `.ics`.
   - *Mejora:* Permitir **exportar** el itinerario completo a un archivo `.ics` descargable o generar un enlace `https://calendar.google.com/render?action=TEMPLATE...` para sincronizar las actividades directamente con la agenda del usuario.

2. **💰 Módulo de Presupuesto y Gastos (Trip Expense Tracker)**
   - Añadir una pestaña o modal para ingresar costos asociados a cada actividad (vuelos, hospedaje, comida, entradas).
   - Desglose por categoría (Transporte, Alojamiento, Comida, Entretenimiento) y gráfico resumen de gastos vs. presupuesto total planeado.
   - Soporte para múltiples divisas con conversión automática (USD, EUR, GBP, JPY, CLP, etc.).

3. **🗺️ Cálculo de Rutas e Itinerario Visual en Mapa (Routing Machine)**
   - Integrar un servicio de ruteo como OSRM (Open Source Routing Machine) o Mapbox Directions para trazar líneas de ruta caminables o en vehículo entre las actividades consecutivas del mismo día.
   - Mostrar estimación de tiempo de viaje y distancia a pie/auto entre el punto A y el punto B.

4. **🧳 Lista de Equipaje / Checklist de Viaje (Packing List & To-Do)**
   - Pestaña de lista de verificación interactiva por viaje (documentos, adaptadores de enchufe, ropa, medicamentos) con plantillas prediseñadas según el destino o clima.

5. **☀️ Integración de Pronóstico del Tiempo (Weather Widget)**
   - Mostrar el clima estimado (temperatura y estado del tiempo) en las pestañas de cada día (`DayTabs`) consultando una API pública como Open-Meteo (sin API key requerida).

6. **📲 Soporte PWA (Progressive Web App) y Modo Offline Avanzado**
   - Configurar `vite-plugin-pwa` con un Service Worker que instale la app en pantallas de inicio de iOS/Android y almacene en caché las baldosas (*tiles*) del mapa previamente visitadas para uso en vuelos o lugares sin conexión a internet.

7. **👥 Colaboración y Compartición en Tiempo Real (vía Supabase)**
   - Permitir generar un enlace único de lectura ("Share Trip") o edición colaborativa en tiempo real sincronizando las mutaciones del contexto con una tabla `trips` en Supabase backend.

---

## 🚀 3. Future Work (Tech Debt, Refactors y Hoja de Ruta)

### 🧹 Deuda Técnica y Refactorizaciones Recomendadas

#### 3.1. Modularización del Componente `TripDetail.tsx`
- **Problema:** `TripDetail.tsx` concentra múltiples responsabilidades en ~364 líneas de código: exportación a markdown, sincronización del mapa con Leaflet, gestión de días seleccionados, manejo de modales y estados de confirmación.
- **Refactor Recomendado:**
  - Extraer la lógica de exportación a un hook dedicado `useExportItinerary(trip)`.
  - Separar la vista en sub-componentes: `TripHeader.tsx`, `TripMapSheet.tsx`, `ItineraryMarkdownExporter.tsx`.

#### 3.2. Implementación de Esquema Zod y Migraciones en Repository Pattern
- **Problema:** En `src/repository/TripRepository.ts`, la deserialización confía ciegamente en que el JSON recuperado coincide con la interfaz `Trip`.
- **Refactor Recomendado:**
  ```typescript
  import { z } from 'zod'

  export const ActivitySchema = z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(['flight', 'hotel', 'food', 'sightseeing', 'transport', 'other']),
    startTime: z.string(),
    endTime: z.string().optional(),
    notes: z.string().optional(),
    location: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
  })
  ```
  Esto garantizará que cualquier cambio futuro en la estructura de datos no corrompa el almacenamiento del cliente.

#### 3.3. Sistema de Internacionalización (i18n) Unificado
- **Problema:** La carpeta `/landing` (Astro) implementa i18n (`/src/i18n/ui.ts` y subrutas `/en/`), pero la aplicación principal SPA en React tiene textos en inglés hardcodeados (`"Add Trip"`, `"Something went wrong"`, etc.).
- **Refactor Recomendado:** Integrar `i18next` o `react-intl` en la SPA para permitir alternar fluidamente entre Español, Inglés y otros idiomas tanto en la Landing como en la App.

#### 3.4. Pruebas End-to-End (E2E) con Playwright
- **Estado Actual:** 47 unit/integration tests pasando con Vitest + JSDOM.
- **Acción Futura:** Agregar una suite de pruebas E2E con Playwright para testear los flujos de usuario críticos:
  1. Crear un viaje nuevo.
  2. Agregar actividades y verificar que aparezcan los pines en el mapa Leaflet.
  3. Importar un archivo `.ics` de prueba.
  4. Borrar viaje con confirmación.

#### 3.5. Gestión de Estado Global Escatable (Si se añade Supabase)
- **Estado Actual:** `TripContext` + `TripRepositoryPattern` funciona de forma impecable para `localStorage`.
- **Acción Futura:** Si la app evoluciona hacia arquitectura multiusuario en la nube, reemplazar o complementar `TripContext` con **TanStack Query (React Query)** o **Zustand** para manejar la invalidación de caché, estados de carga (loading spinners) y optimismo en mutaciones.

---

## 📊 Resumen Ejecutivo y Conclusión

Roamly cuenta con una base de código moderna, bien estructurada y testeada (React 19 + TypeScript + Vite + Tailwind + Repository Pattern).

| Criterio | Puntuación | Estado |
| :--- | :---: | :--- |
| **Seguridad** | 9.0 / 10 | 🟢 Bueno (Aislar sanitización ICS y restrict CORS en proxy) |
| **Arquitectura & DX** | 9.5 / 10 | 🟢 Excelente (Repository Pattern desacoplado y 47/47 tests) |
| **Rendimiento** | 9.5 / 10 | 🟢 Excelente (Bundle splitting <68kB, rate limiting geocoding) |
| **Nuevas Features (Roadmap)** | High Potential | 🚀 Listo para iterar en PWA, Export .ics y Budget Tracker |

---

*Reporte generado automáticamente en el directorio `.audit/FULL_REVIEW.md`*.
