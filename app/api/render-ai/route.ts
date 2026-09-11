import { NextRequest, NextResponse } from 'next/server';

interface RenderRequest {
  imageBase64: string;
  styleId?: string;
  lightingId?: string;
  customPrompt?: string;
  roomInfo?: {
    roomType?: string;
    width?: number;
    depth?: number;
    materialsSummary?: string;
  };
  userApiKey?: string;
}

const STYLE_PROMPTS: Record<string, string> = {
  'luxury-modern':
    'Ultra-luxury modern interior design, polished Calacatta marble surfaces, brushed brass hardware, warm recessed LED cove lighting, Italian designer minimalist furniture, clean lines, high-end Architectural Digest photography, 8k resolution, photorealistic.',
  scandinavian:
    'Warm Scandinavian Japandi interior design, light white oak wood textures, textured linen and bouclé upholstery, soft diffused natural daylight, delicate ceramic accents, potted indoor plants, peaceful cozy atmosphere, architectural photography.',
  'industrial-loft':
    'Contemporary luxury industrial loft, exposed dark rustic textured stone and concrete wall, matte black steel frames, rich cognac leather seating, warm filament pendant lights, polished micro-cement flooring, dramatic architectural contrast.',
  classic:
    'Timeless classic European elegance, subtle boiserie wall mouldings, herringbone natural wood floor, warm golden chandelier ambient lighting, plush velvet accents, sophisticated upscale residential interior.',
  'rustic-chic':
    'Modern farmhouse rustic chic, rugged natural dry-stone accent wall, solid reclaimed timber beams, soapstone and honed granite countertops, warm welcoming ambient glow, artisanal ceramic tableware.',
  minimalist:
    'Ultra-clean contemporary minimalism, seamless hidden cabinetry, monolithic dark granite kitchen island, architectural strip lighting, seamless flush transitions, refined luxury aesthetic.',
};

const LIGHTING_PROMPTS: Record<string, string> = {
  daylight:
    'Bright natural morning sunlight streaming across surfaces, crisp soft shadows, airy high-key atmosphere, vivid natural color rendering.',
  'golden-hour':
    'Warm golden hour sunset light casting long soft shadows, warm amber glow on surfaces, magical cozy evening ambiance.',
  'night-moody':
    'Cinematic moody night lighting, warm 2700K integrated under-cabinet LED strips, warm spot lighting focusing on key furniture surfaces, sophisticated luxury evening look.',
  'studio-soft':
    'Professional architectural diffuse softbox studio lighting, perfectly balanced light distribution, crystal clear reflections on glossy surfaces and metals.',
};

// Models that support native multimodal image generation with input image conditioning
const IMAGE_GEN_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-exp-1206',
];

export async function POST(req: NextRequest) {
  try {
    const body: RenderRequest = await req.json();
    const {
      imageBase64,
      styleId = 'luxury-modern',
      lightingId = 'daylight',
      customPrompt = '',
      roomInfo,
      userApiKey,
    } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Nenhuma imagem enviada para renderização.' },
        { status: 400 }
      );
    }

    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Chave da API Gemini não configurada.',
          needsApiKey: true,
          message:
            'Para gerar renders fotorrealistas em tempo real, configure sua chave da API nas configurações do modal.',
        },
        { status: 401 }
      );
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    const mimeType = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,/)?.[1] || 'image/jpeg';

    const selectedStyle = STYLE_PROMPTS[styleId] || STYLE_PROMPTS['luxury-modern'];
    const selectedLighting = LIGHTING_PROMPTS[lightingId] || LIGHTING_PROMPTS['daylight'];

    // Direct Image-to-Image Prompt preserving geometry and placement
    const imageToImagePrompt = [
      'Transform this exact 3D interior design mockup scene into an ultra-photorealistic, luxury architectural interior photograph.',
      'STRICT GEOMETRY AND LAYOUT CONSTRAINTS:',
      '1. Strictly preserve the exact camera angle, perspective, room dimensions, wall boundaries, and doors/windows shown in this input 3D scene.',
      '2. Strictly preserve the exact position, orientation, scale, and placement of every piece of furniture, appliance, and counter (e.g., refrigerator, kitchen island, cabinets, sink, hood, bar stools) exactly where they appear in the input image.',
      '3. Convert the basic 3D blocky models into hyper-realistic real-world furniture with tangible textures (real wood grain, polished stone, stainless steel, glass reflections).',
      `4. STYLE: ${selectedStyle}`,
      `5. LIGHTING: ${selectedLighting}`,
      customPrompt.trim() ? `6. SPECIAL INSTRUCTIONS: ${customPrompt.trim()}` : '',
      'Quality: Masterpiece, 8K resolution, realistic raytraced global illumination, award-winning interior design magazine photograph.',
    ]
      .filter(Boolean)
      .join('\n');

    // ─────────────────────────────────────────────────────────────────────────────
    // STRATEGY 1: Native Gemini Multimodal Image Generation (Image-to-Image with responseModalities: ["TEXT", "IMAGE"])
    // ─────────────────────────────────────────────────────────────────────────────
    for (const modelName of IMAGE_GEN_MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: imageToImagePrompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              temperature: 0.4,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data?.candidates?.[0];
          const parts = candidate?.content?.parts || [];

          for (const part of parts) {
            const inlineData = part.inlineData || part.inline_data;
            if (inlineData?.data) {
              const outMime = inlineData.mimeType || inlineData.mime_type || 'image/png';
              return NextResponse.json({
                renderedImageUrl: `data:${outMime};base64,${inlineData.data}`,
                promptUsed: imageToImagePrompt,
                engine: `Gemini Multimodal (${modelName})`,
              });
            }
          }
        } else {
          const errText = await response.text();
          console.warn(`Model ${modelName} with responseModalities failed:`, errText);
        }
      } catch (err) {
        console.warn(`Failed call to ${modelName}:`, err);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STRATEGY 2: Google Imagen 3 Image Prediction
    // ─────────────────────────────────────────────────────────────────────────────
    try {
      const imagenEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      const imagenRes = await fetch(imagenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [
            {
              prompt: imageToImagePrompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            outputOptions: { mimeType: 'image/jpeg' },
          },
        }),
      });

      if (imagenRes.ok) {
        const data = await imagenRes.json();
        const base64Img = data?.predictions?.[0]?.bytesBase64Encoded;
        if (base64Img) {
          return NextResponse.json({
            renderedImageUrl: `data:image/jpeg;base64,${base64Img}`,
            promptUsed: imageToImagePrompt,
            engine: 'Google Imagen 3.0',
          });
        }
      }
    } catch (imagenErr) {
      console.warn('Imagen 3 predict call failed:', imagenErr);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STRATEGY 3: Gemini Vision Detailed Spatial Breakdown + Image Synthesis
    // ─────────────────────────────────────────────────────────────────────────────
    let detailedSceneAnalysis = '';
    for (const visionModel of ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest']) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Analyze this 3D interior design scene mockup in detail. Describe strictly what is in the scene:
1. Camera viewpoint and perspective angle.
2. Every item of furniture, cabinets, kitchen counters, appliances (refrigerator, hood, sink), and their exact arrangement and positions relative to each other and the walls.
3. Wall colors/textures (e.g. rustic dark stone wall or painted wall) and floor pattern.
Now synthesize this into a single paragraph description for an architectural renderer to produce an exact photo of this layout in ${selectedStyle} style with ${selectedLighting} lighting. Do not invent unrelated rooms.`,
                  },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const desc = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (desc && desc.trim().length > 30) {
            detailedSceneAnalysis = desc.trim();
            break;
          }
        }
      } catch (err) {
        console.warn(`Vision model ${visionModel} failed:`, err);
      }
    }

    if (!detailedSceneAnalysis) {
      detailedSceneAnalysis = `Modern kitchen layout with dark island counter, base cabinets, sink, range hood, large refrigerator, stone texture wall, tiled floor, ${selectedStyle}, ${selectedLighting}`;
    }

    // Generate with scene-accurate detailed analysis
    const cleanPrompt = encodeURIComponent(
      `${detailedSceneAnalysis}, architectural photography, 8k resolution, photorealistic interior design, masterpiece, sharp focus, magazine cover quality`
    );
    const seed = Math.floor(Math.random() * 999999);
    const fluxUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&model=flux-realism&seed=${seed}&nologo=true`;

    const imgResponse = await fetch(fluxUrl);
    if (imgResponse.ok) {
      const arrayBuffer = await imgResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return NextResponse.json({
        renderedImageUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
        promptUsed: detailedSceneAnalysis,
        engine: 'Gemini Vision + Flux Realism',
      });
    }

    return NextResponse.json(
      {
        error: 'Erro ao gerar o render fotorrealista. Por favor, tente novamente.',
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('API /api/render-ai error:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor ao processar requisição.' },
      { status: 500 }
    );
  }
}
