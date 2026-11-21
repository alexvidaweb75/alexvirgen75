# Sonora Studio

Plataforma web creativa para componer letras personalizadas, canciones dedicadas, mezclas de audio multipista (Web Audio API) y videoclips musicales con exportación local.

> **Uso previsto:** Proyecto educativo, familiar y académico **sin fines de lucro**. No está destinado para su venta o comercialización.

## Características principales

- **Compositor musical por dedicatoria:** Genera letras y arreglos armónicos a partir del nombre y rasgos de la persona o personita a quien va dedicada la canción.
- **Géneros y ritmos bailables:** Cumbia Sonidera, Electrocumbia Futurista, Cumbia Romántica, Salsa Brava, Merengue, Bachata, Tropipop, Synthwave, Cyber-Pop y más.
- **Taller de letras y sintetizador vocal:** Edición por secciones, voces solistas, coros y reproducción multipista sincronizada.
- **Estudio de video:** Visualizador reactivo al audio con modos de ritmo visual y exportación a `.webm` y `.wav`.
- **Biblioteca local:** Guardado automático en `localStorage` e `IndexedDB` del navegador.

## Configuración de variables de entorno

1. Copia `.env.example` o configura las variables en tu plataforma de despliegue (por ejemplo, en **Settings > Secrets** de AI Studio o en las variables de entorno de tu servidor):
   - `GEMINI_API_KEY`: Tu clave de la API de Gemini (obtenida en Google AI Studio). **Nunca** la subas al código fuente ni a repositorios públicos.
   - `PORT`: Puerto del servidor (por defecto `3000`).

## Ejecución local y publicación

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar el cliente (genera /dist)
npm run build

# 3. Iniciar servidor de producción (Express + /dist)
npm start
```

Para desarrollo:

```bash
npm run dev
```
