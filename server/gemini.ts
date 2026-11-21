import { GoogleGenAI, Type } from '@google/genai';

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'Falta configurar GEMINI_API_KEY en el panel de Secrets de AI Studio.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      timeout: 60000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const causeMsg =
    err instanceof Error && err.cause
      ? ` (${err.cause instanceof Error ? err.cause.message : String(err.cause)})`
      : '';
  console.error('[Sonora Studio Gemini Error]:', raw + causeMsg);
  if (
    raw.includes('GEMINI_API_KEY') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('API key not valid')
  ) {
    return {
      status: 400,
      message:
        'Clave GEMINI_API_KEY no configurada o inválida. Revisa la sección Settings > Secrets.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'Permiso denegado por la API de Gemini. Verifica tu clave en Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Límite de cuota alcanzado temporalmente en Gemini. Intenta nuevamente en unos segundos.',
    };
  }
  if (raw.toLowerCase().includes('timeout') || raw.toLowerCase().includes('abort')) {
    return {
      status: 504,
      message:
        'Tiempo de espera agotado al conectar con Gemini. Verifica tu clave GEMINI_API_KEY en Settings > Secrets e intenta de nuevo.',
    };
  }
  return {
    status: 500,
    message: `${raw}${causeMsg}` || 'Error interno al comunicarse con Gemini.',
  };
}

export interface ComposeSongInput {
  dedicatee: string;
  occasion: string;
  traits: string;
  genreName: string;
  rhythmName: string;
  meter: string;
  styleName: string;
  voiceName: string;
  choirName: string;
  artistName: string;
  moodName: string;
  rhymeFlowName: string;
  bpm: number;
  language: string;
}

export async function composeSongWithGemini(input: ComposeSongInput) {
  const ai = getGeminiClient();

  const prompt = `Crea una canción original, pegajosa y con mucho sabor musical dedicada a "${input.dedicatee}".
Ocasión o vínculo: ${input.occasion}.
Palabras y características de la persona o personita: ${input.traits}.
Género musical: ${input.genreName}.
Ritmo y compás: ${input.rhythmName} (${input.meter}, ${input.bpm} BPM).
Estilo de producción: ${input.styleName}.
Ánimo / Mood (estilo Wrizzle): ${input.moodName}.
Estructura / Flujo de rima: ${input.rhymeFlowName}.
Voz principal: ${input.voiceName}.
Coros y armonías: ${input.choirName}.
Inspiración artística: ${input.artistName}.
Idioma principal de la letra: ${input.language}.

Requisitos creativos:
1. Integra de forma natural, memorable y cantable TODAS las características mencionadas sobre "${input.dedicatee}" dentro de los versos y el coro.
2. Si el género es Cumbia, Electrocumbia, Salsa, Merengue, Bachata, Tropipop o Bailable, incluye un saludo/intro sabroso, un Coro altamente bailable y una sección de Pregón o Mambo con llamado y respuesta.
3. Usa métricas y rimas fluidas que encajen exactamente con el ritmo ${input.rhythmName} a ${input.bpm} BPM.
4. Incluye secciones claras: Intro, Verso 1, Pre-Coro, Coro Bailable (o Coro), Pregón / Puente, Verso 2 y Outro.
5. Propón una progresión de 4 acordes estándar (por ejemplo: ["Am", "G", "F", "E7"] o ["C", "G", "Am", "F"]), tonalidad musical, patrón de bajo e instrumentos.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      systemInstruction:
        'Eres un compositor tropical, letrista pop y productor musical galardonado. Escribes letras memorables con gran ritmo bailable, pregones contagiosos y arreglos armónicos reales en formato JSON estricto.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Título atractivo y musical de la canción.',
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                tag: { type: Type.STRING },
                title: { type: Type.STRING },
                lines: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['tag', 'title', 'lines'],
            },
          },
          keySignature: {
            type: Type.STRING,
            description: 'Tonalidad musical, por ejemplo "La Menor (Am)" o "Do Mayor (C)".',
          },
          chordProgression: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exactamente 4 acordes musicales en cifrado americano.',
          },
          bassPattern: {
            type: Type.STRING,
            description: 'Descripción corta del patrón de bajo.',
          },
          instruments: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Lista de 4 instrumentos principales del arreglo.',
          },
        },
        required: [
          'title',
          'sections',
          'keySignature',
          'chordProgression',
          'bassPattern',
          'instruments',
        ],
      },
    },
  });

  const text = (response.text ?? '').trim();
  if (!text) {
    throw new Error('El modelo no devolvió contenido de letra.');
  }
  return JSON.parse(text);
}

export interface VocalSynthesisInput {
  sections: Array<{ tag: string; title: string; lines: string[] }>;
  prebuiltVoice: 'Kore' | 'Charon' | 'Puck' | 'Zephyr' | 'Fenrir';
  isDualVoice: boolean;
  secondaryVoice?: 'Kore' | 'Charon' | 'Puck' | 'Zephyr' | 'Fenrir';
  genreName: string;
  styleName: string;
  artistName: string;
  choirName: string;
  bpm: number;
}

export async function synthesizeVocalWithGemini(input: VocalSynthesisInput): Promise<string> {
  const ai = getGeminiClient();

  const selectedSections = input.sections.slice(0, 4);

  if (input.isDualVoice) {
    const secondVoice: 'Kore' | 'Charon' | 'Puck' | 'Zephyr' | 'Fenrir' =
      input.secondaryVoice && input.secondaryVoice !== input.prebuiltVoice
        ? input.secondaryVoice
        : input.prebuiltVoice === 'Kore'
          ? 'Puck'
          : 'Kore';

    const styleHint = `Upbeat, expressive, rhythmic ${input.genreName} (${input.styleName}) vocal phrasing around ${input.bpm} BPM.`;
    const parts = selectedSections.map((sec) => {
      const isChorus =
        sec.tag.toLowerCase().includes('coro') ||
        sec.tag.toLowerCase().includes('pregon') ||
        sec.tag.toLowerCase().includes('outro');
      const speaker = isChorus ? 'Coro' : 'VozPrincipal';
      return {
        text: `${speaker}: ${sec.lines.join('. ')}`,
        speechMetadata: {
          speaker,
          style: isChorus
            ? `Energetic harmonized chorus vocal response (${input.choirName}), joyful and rhythmic`
            : styleHint,
        },
      };
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'VozPrincipal',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: input.prebuiltVoice },
                },
              },
              {
                speaker: 'Coro',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: secondVoice },
                },
              },
            ],
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No se recibió audio vocal desde Gemini TTS.');
    }
    return `data:audio/wav;base64,${base64Audio}`;
  }

  const fullText = selectedSections.map((s) => s.lines.join('. ')).join(' ... ');
  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Say expressively and rhythmically in ${input.genreName} style: ${fullText}`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: input.prebuiltVoice },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('No se recibió audio vocal desde Gemini TTS.');
  }
  return `data:audio/wav;base64,${base64Audio}`;
}

export async function rewriteSectionWithGemini(input: {
  dedicatee: string;
  traits: string;
  genreName: string;
  sectionTitle: string;
  currentLines: string[];
  instruction: string;
}) {
  const ai = getGeminiClient();

  const prompt = `Reescribe únicamente la sección "${input.sectionTitle}" de una canción del género ${input.genreName} dedicada a "${input.dedicatee}" (características: ${input.traits}).
Líneas actuales:
${input.currentLines.join('\n')}

Instrucción de mejora: ${input.instruction}

Devuelve exactamente 4 líneas nuevas (o 2 si es Intro/Outro/Pregón) con rima y ritmo musical natural.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lines: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['lines'],
      },
    },
  });

  const text = (response.text ?? '').trim();
  return JSON.parse(text) as { lines: string[] };
}

export async function generateStoryboardWithGemini(input: {
  title: string;
  dedicatee: string;
  prompt: string;
  visualStyleName: string;
  videoRhythmName: string;
  durationSeconds: number;
  lyricsSummary: string;
}) {
  const ai = getGeminiClient();

  const sceneCount = 4;
  const secPerScene = Math.max(4, Math.round(input.durationSeconds / sceneCount));

  const prompt = `Crea un guion visual cinematográfico de ${sceneCount} escenas para el video musical "${input.title}" dedicado a "${input.dedicatee}".
Estilo visual: ${input.visualStyleName}.
Ritmo de edición / movimiento (estilo Deevid): ${input.videoRhythmName}.
Idea o descripción del usuario: ${input.prompt}.
Fragmentos de la letra: ${input.lyricsSummary}.
Duración total: ${input.durationSeconds} segundos (${secPerScene}s por escena aproximadamente).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      systemInstruction:
        'Eres director de videoclips musicales modernos y futuristas. Responde únicamente con JSON estructurado para las escenas.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                startSec: { type: Type.NUMBER },
                endSec: { type: Type.NUMBER },
                title: { type: Type.STRING },
                visualDescription: { type: Type.STRING },
                cameraMotion: {
                  type: Type.STRING,
                  description: 'Uno de: zoom-in, pan-right, pan-left, slow-drift',
                },
                caption: {
                  type: Type.STRING,
                  description: 'Frase poética o de fiesta breve para mostrar en pantalla.',
                },
              },
              required: [
                'sceneNumber',
                'startSec',
                'endSec',
                'title',
                'visualDescription',
                'cameraMotion',
                'caption',
              ],
            },
          },
        },
        required: ['scenes'],
      },
    },
  });

  const text = (response.text ?? '').trim();
  return JSON.parse(text);
}
