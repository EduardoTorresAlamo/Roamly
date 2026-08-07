# 🛡️ Reporte de Auditoría de Seguridad — Roamly

**Módulo:** Seguridad, Sanitización de Entradas y Protección de Datos  
**Fecha:** 7 de Agosto de 2026  
**Auditor:** Code Reviewer & Security Auditor Agent (`code-reviewer-auditor`)

---

## 🎯 Resumen de Hallazgos de Seguridad

| ID | Severidad | Título / Área | Archivo Afectado | Estado |
| :--- | :---: | :--- | :--- | :---: |
| **SEC-01** | 🟠 ALTO | Exposición de Claves API de Cliente (`VITE_UNSPLASH_ACCESS_KEY`) | [`src/utils/destinationImages.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/destinationImages.ts) | **RESUELTO ✅ (Edge Proxy)** |
| **SEC-02** | 🟠 ALTO | Eliminación Destructiva Sin Confirmación (Pérdida Accidental) | [`src/components/dashboard/TripCard.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/dashboard/TripCard.tsx) | **RESUELTO ✅ (ConfirmDialog)** |
| **SEC-03** | 🟡 MEDIO | Lectura de `localStorage` Sin Validar Esquema de Objetos | [`src/repository/TripRepository.ts`](file:///Users/eduardotorres/Developer/Roamly/src/repository/TripRepository.ts#L47-L57) | **MEJORADO ✅ (Soft Failure / Repo)** |
| **SEC-04** | 🟡 MEDIO | Concatención y Renderizado de Archivos ICS Sin Sanitizar | [`src/utils/icsParser.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/icsParser.ts#L223) | PENDIENTE |
| **SEC-05** | 🟢 BAJO | Cabecera User-Agent Estática en Consultas Nominatim | [`src/utils/geocoding.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/geocoding.ts#L5) | INFORMATIVO |

---

## 🔍 Análisis Detallado de Hallazgos de Seguridad

### SEC-01: Exposición de Claves API de Unsplash en Bundle Client (🟠 ALTO — RESUELTO ✅)

#### Diagnóstico Previo vs Estado Actual
- **Previo:** `import.meta.env.VITE_UNSPLASH_ACCESS_KEY` se compilaba directamente en el bundle JS cliente, permitiendo a cualquier usuario extraer la clave de Unsplash desde la consola del navegador.
- **Estado Actual:** ✅ **Resuelto**. Se implementó una función Edge Proxy en [`api/unsplash.ts`](file:///Users/eduardotorres/Developer/Roamly/api/unsplash.ts) que ejecuta la autenticación en el lado del servidor con `process.env.UNSPLASH_ACCESS_KEY`. [`src/utils/destinationImages.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/destinationImages.ts#L24) consume la proxy vía `PROXY_URL` (`VITE_UNSPLASH_PROXY_URL`) o recurre al catálogo estático curado en `src/data/curatedDestinations.json`.

---

### SEC-02: Borrado Destructivo Directo Sin Confirmación (🟠 ALTO — RESUELTO ✅)

#### Diagnóstico Previo vs Estado Actual
- **Previo:** Al presionar el botón de la papelera en un viaje o actividad, se ejecutaba inmediatamente la función de borrado de `localStorage`, sin modal de confirmación ni opción de deshacer.
- **Estado Actual:** ✅ **Resuelto**. Se creó el componente reutilizable [`src/components/modals/ConfirmDialog.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/modals/ConfirmDialog.tsx) utilizando Radix UI Dialog. [`TripCard.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/dashboard/TripCard.tsx), [`ActivityItem.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/components/trip/ActivityItem.tsx), [`Dashboard.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/pages/Dashboard.tsx) y [`TripDetail.tsx`](file:///Users/eduardotorres/Developer/Roamly/src/pages/TripDetail.tsx) invocan la confirmación previo a remover elementos.

---

### SEC-03: Tolerancia a Fallos en Almacenamiento Local (🟡 MEDIO — MEJORADO ✅)

#### Diagnóstico Previo vs Estado Actual
- **Previo:** La lectura directa de `localStorage` mediante `JSON.parse` podía provocar excepciones de síntaxis si los datos estaban corruptos.
- **Estado Actual:** ✅ **Mejorado**. [`LocalStorageTripRepository`](file:///Users/eduardotorres/Developer/Roamly/src/repository/TripRepository.ts) encapsula la lectura y escritura en bloques `try/catch`. En caso de corrupción JSON o indisponibilidad de almacenamiento, la aplicación degrada suavemente (*fail-soft*) retornando un array vacío y registrando el error en consola, previniendo cuelgues catastróficos.

---

### SEC-04: Parsing e Importación de Archivos ICS Sin Sanitizar (🟡 MEDIO — PENDIENTE)

#### Diagnóstico
En [`src/utils/icsParser.ts`](file:///Users/eduardotorres/Developer/Roamly/src/utils/icsParser.ts#L223):
```typescript
description: description ? description.replace(/\\n/g, '\n').replace(/\\,/g, ',') : undefined,
```
- **Riesgo:** Al exportar el itinerario a Markdown en `TripDetail.tsx` (`generateItineraryMarkdown`), cadenas no sanitizadas provenientes de archivos `.ics` externos podrían inyectar enlaces maliciosos o formatos de script si el usuario pega el resumen en lectores externos.
- **Remediación Recomendada:** Sanitizar URLs y truncar descripciones desproporcionadamente largas.

---

## 🛡️ Checklist de Control de Seguridad

- [x] Aislar `UNSPLASH_ACCESS_KEY` en Edge Function backend proxy.
- [x] Proteger acciones de borrado destructivas mediante `ConfirmDialog`.
- [x] Capturar excepciones globales de renderizado con `ErrorBoundary`.
- [x] Encapsular operaciones de persistencia en `TripRepository` con degradación suave (*fail-soft*).
- [ ] Sanitizar hipervínculos en archivos `.ics` importados.
