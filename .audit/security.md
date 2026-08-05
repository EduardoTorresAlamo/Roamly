# 🛡️ Reporte de Auditoría de Seguridad — Roamly

**Módulo:** Seguridad, Sanitización y Protección de Datos  
**Fecha:** 5 de Agosto de 2026

---

## 1. Evaluación de Exposición de Credenciales y Claves API

### SEC-01: Exposición de `VITE_UNSPLASH_ACCESS_KEY` en el Bundle Cliente
- **Severidad:** 🟠 ALTA
- **Archivo afectado:** [`src/utils/destinationImages.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/destinationImages.ts#L210)
- **Análisis de Código:**
```typescript
export async function fetchDestinationImage(destination: string): Promise<UnsplashResult> {
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined
  if (accessKey) {
    const res = await fetch(`https://api.unsplash.com/photos/random?...&client_id=${accessKey}`)
    ...
  }
}
```
- **Vulnerabilidad:** En aplicaciones cliente compiladas con Vite/React, las variables prefijadas con `VITE_` son incrustadas directamente en el bundle JavaScript estático (`dist/assets/index-*.js`). Cualquier usuario o atacante puede abrir la consola de desarrollo del navegador o inspeccionar el bundle y extraer la clave de Unsplash.
- **Riesgo:** Cuota de API agotada, costos inesperados o suspensión de la cuenta de Unsplash por abuso de consumo.
- **Remediación Recomendada:**
  1. No utilizar la clave directa en el cliente si es un secreto de producción.
  2. Implementar una función Serverless / Edge Proxy (e.g. Vercel / Netlify Edge Function o Cloudflare Worker) para autenticar las peticiones a Unsplash en el lado del servidor.

---

## 2. Inyección y Sanitización de Entradas (XSS & Data Injection)

### SEC-02: Decodificación y Renderizado Desprotegido de Archivos ICS
- **Severidad:** 🟡 MEDIA
- **Archivo afectado:** [`src/utils/icsParser.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/icsParser.ts#L223-L225)
- **Análisis de Código:**
```typescript
description: description ? description.replace(/\\n/g, '\n').replace(/\\,/g, ',') : undefined,
```
- **Vulnerabilidad:** El analizador de archivos `.ics` realiza reemplazos manuales de caracteres de escape y concatena campos `LOCATION` y `DESCRIPTION` sin validación estructural ni límites de tamaño.
- **Riesgo:** Si bien React previene inyecciones XSS directas en la visualización de nodos DOM, al exportar a Markdown (`generateItineraryMarkdown` en `TripDetail.tsx`), cadenas maliciosas en archivos `.ics` importados podrían contener bloques Markdown o enlaces maliciosos (`javascript:...`) que se copien al portapapeles y se ejecuten en visores externos.
- **Remediación Recomendada:**
  1. Sanitizar enlaces y cadenas de texto al importar eventos.
  2. Truncar campos desproporcionadamente largos (e.g. notas > 2000 caracteres) para evitar colapsar `localStorage`.

---

## 3. Pérdida e Integridad de Datos

### SEC-03: Falta de Confirmación en Acciones Destructivas
- **Severidad:** 🟠 ALTA
- **Archivos afectados:**
  - [`src/components/dashboard/TripCard.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/dashboard/TripCard.tsx#L93-L99)
  - [`src/components/trip/ActivityItem.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/trip/ActivityItem.tsx#L148-L154)
- **Análisis de Código:**
```tsx
// TripCard.tsx
<button onClick={handleDelete} className="...">
  <Trash2 className="..." />
</button>
```
- **Vulnerabilidad:** El botón de la papelera elimina inmediatamente el viaje o actividad invocando `deleteTrip` / `deleteActivity`. No existe ningún diálogo emergente de confirmación (*Are you sure?*) ni mecanismo de deshacer (*Undo Toast*).
- **Riesgo:** Pérdida accidental irrecuperable de itinerarios enteros por toques involuntarios en dispositivos móviles.
- **Remediación Recomendada:**
  1. Implementar un diálogo de confirmación previa usando `<Dialog>` o un patrón de borrado suave (*soft-delete*) con opción de Deshacer (*Undo*) durante 5 segundos.

---

## 4. Deserialización no Segura en Persistencia Local

### SEC-04: Lectura de `localStorage` Sin Validar Esquema
- **Severidad:** 🟡 MEDIA
- **Archivo afectado:** [`src/hooks/useLocalStorage.ts`](file:///Users/eduardotorres/Developer/Roamly/src/hooks/useLocalStorage.ts#L25-L27)
- **Análisis de Código:**
```typescript
const item = window.localStorage.getItem(key)
return item ? (JSON.parse(item) as T) : initialValue
```
- **Vulnerabilidad:** `JSON.parse` únicamente verifica sintaxis JSON válida, pero asigna la estructura mediante un `as T` inseguro. Si el contenido almacenado fue modificado externamente, corrompido o proviene de una versión anterior de la app donde la estructura cambió, las propiedades requeridas (como `days` o `activities`) pueden ser `undefined`.
- **Riesgo:** Excepciones no controladas en tiempo de ejecución (`TypeError: Cannot read properties of undefined (reading 'map')`) al cargar la aplicación.
- **Remediación Recomendada:**
  1. Integrar validación de esquemas en tiempo de ejecución con **Zod**:
```typescript
import { z } from 'zod'

const TripSchema = z.array(z.object({
  id: z.string(),
  destination: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  days: z.array(z.object({
    id: z.string(),
    date: z.string(),
    activities: z.array(z.any())
  }))
}))
```

---

## 5. Cabecera HTTP y Solicitudes a Servicios Públicos

### SEC-05: User-Agent Fijo y Falta de Control de Origen en Peticiones OSM
- **Severidad:** 🔵 BAJA / INFO
- **Archivo afectado:** [`src/utils/geocoding.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/geocoding.ts#L5)
- **Vulnerabilidad:** La constante `HEADERS` utiliza una cadena fija `User-Agent: 'Roamly/1.0 (travel planning app)'`. Aunque cumple con los requisitos mínimos de Nominatim, no incluye un email de contacto ni identificador único, lo que en despliegues masivos podría ocasionar bloqueos por IP si Nominatim considera el trafico como bot anónimo.
