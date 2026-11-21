import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  composeSongWithGemini,
  formatGeminiError,
  generateStoryboardWithGemini,
  rewriteSectionWithGemini,
  synthesizeVocalWithGemini,
} from './server/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    const rawKey = process.env.GEMINI_API_KEY?.trim() || '';
    const hasApiKey = Boolean(rawKey && rawKey !== 'MY_GEMINI_API_KEY');
    res.json({ ok: true, hasApiKey });
  });

  app.post('/api/music/compose', async (req, res) => {
    try {
      const body = req.body ?? {};
      if (!body.dedicatee || !body.traits) {
        return res.status(400).json({
          error: 'Ingresa el nombre de la persona y al menos una característica.',
        });
      }

      const result = await composeSongWithGemini({
        dedicatee: String(body.dedicatee),
        occasion: String(body.occasion || 'Para alguien especial'),
        traits: String(body.traits),
        genreName: String(body.genreName || 'Balada Pop'),
        rhythmName: String(body.rhythmName || 'Balada 4/4 Suave'),
        meter: String(body.meter || '4/4'),
        styleName: String(body.styleName || 'Piano & Cuerdas'),
        voiceName: String(body.voiceName || 'Voz Femenina Cálida'),
        choirName: String(body.choirName || 'Voz Solista Íntima'),
        artistName: String(body.artistName || 'Orquesta de Cumbia Sonora'),
        moodName: String(body.moodName || 'Alegre y Bailable'),
        rhymeFlowName: String(body.rhymeFlowName || 'Pregón y Coro Bailable'),
        bpm: Number(body.bpm || 96),
        language: String(body.language || 'Español'),
      });

      return res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/music/vocal', async (req, res) => {
    try {
      const body = req.body ?? {};
      if (!Array.isArray(body.sections) || body.sections.length === 0) {
        return res.status(400).json({ error: 'Se requieren secciones de letra para generar la voz.' });
      }

      const audioDataUrl = await synthesizeVocalWithGemini({
        sections: body.sections,
        prebuiltVoice: body.prebuiltVoice || 'Kore',
        isDualVoice: Boolean(body.isDualVoice),
        secondaryVoice: body.secondaryVoice,
        genreName: String(body.genreName || 'Cumbia Sonidera'),
        styleName: String(body.styleName || 'Cumbia & Trópico Vivo'),
        artistName: String(body.artistName || 'Orquesta de Cumbia Sonora'),
        choirName: String(body.choirName || 'Solo'),
        bpm: Number(body.bpm || 96),
      });

      return res.json({ audioDataUrl });
    } catch (err) {
      const formatted = formatGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/lyrics/rewrite', async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await rewriteSectionWithGemini({
        dedicatee: String(body.dedicatee || 'Alguien especial'),
        traits: String(body.traits || ''),
        genreName: String(body.genreName || 'Cumbia Sonidera'),
        sectionTitle: String(body.sectionTitle || 'Coro'),
        currentLines: Array.isArray(body.currentLines) ? body.currentLines : [],
        instruction: String(body.instruction || 'Hazlo más bailable y emotivo.'),
      });
      return res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/video/storyboard', async (req, res) => {
    try {
      const body = req.body ?? {};
      const result = await generateStoryboardWithGemini({
        title: String(body.title || 'Dedicatoria Visual'),
        dedicatee: String(body.dedicatee || 'Alguien especial'),
        prompt: String(body.prompt || 'Luces cálidas, fiesta tropical y momentos inolvidables.'),
        visualStyleName: String(body.visualStyleName || 'Holograma Cyber-Neón'),
        videoRhythmName: String(body.videoRhythmName || 'Beat-Sync Pulso (Deevid)'),
        durationSeconds: Number(body.durationSeconds || 30),
        lyricsSummary: String(body.lyricsSummary || ''),
      });
      return res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      return res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build not found. Run npm run build.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Sonora Studio server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
