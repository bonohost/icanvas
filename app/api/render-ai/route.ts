import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

interface RenderRequest {
  imageBase64: string;
  renderType?: 'normal' | '360';
  engine?: 'openai' | 'gemini';
  styleId?: string;
  lightingId?: string;
  customPrompt?: string;
  sceneJson?: any;
  roomInfo?: {
    roomType?: string;
    width?: number;
    depth?: number;
    height?: number;
    materialsSummary?: string;
  };
  userApiKey?: string;
  model?: string;
}

const STYLE_PROMPTS: Record<string, string> = {
  'luxury-modern':
    'Ultra-luxury modern interior design, polished Calacatta marble, rich dark walnut wood veneer, brushed brass profiles, warm recessed linear LED cove lighting, Italian high-end architectural finish.',
  scandinavian:
    'Warm Scandinavian Japandi interior, light natural white oak wood, textured bouclé and linen fabrics, soft diffused natural daylight, delicate handcrafted ceramics and indoor plants.',
  'industrial-loft':
    'Contemporary Luxury Industrial Loft, rustic textured exposed natural stone and micro-cement wall, matte black architectural steel frames, cognac saddle leather upholstery, warm filament pendant lighting.',
  classic:
    'Timeless European Elegance, subtle boiserie wall mouldings, natural chevron herringbone hardwood floor, warm golden ambient chandelier glow, plush velvet accents, noble residential atmosphere.',
  'rustic-chic':
    'Modern Farmhouse Rustic Chic, textured natural dry-stone accent wall, solid reclaimed timber ceiling beams, soapstone and honed granite countertops, welcoming cozy ambient atmosphere.',
  minimalist:
    'Pure Architectural Minimalism, seamless flush handleless cabinetry, monolithic dark stone kitchen island, indirect cove strip lighting, refined luxury aesthetic without clutter.',
};

const LIGHTING_PROMPTS: Record<string, string> = {
  daylight:
    'Bright natural daylight streaming softly into the room, crisp realistic shadows, airy high-key atmosphere with vivid natural color balance.',
  'golden-hour':
    'Warm golden hour sunset light casting long soft shadows, warm amber glow across furniture and floor surfaces, cozy luxury ambiance.',
  'night-moody':
    'Moody architectural night lighting, warm 2700K integrated LED strips under cabinets and baseboards, soft focused spotlights accentuating furniture textures.',
  'studio-soft':
    'Professional architectural softbox studio lighting, perfectly balanced light distribution, sharp crystal clear reflections on polished surfaces and metals.',
};

/**
 * Normal 16:9 Architectural Perspective View Prompt
 */
function createNormalArchitecturalPrompt({
  sceneJson,
  styleDescription,
  lightingDescription,
  customPrompt,
}: {
  sceneJson?: any;
  styleDescription?: string;
  lightingDescription?: string;
  customPrompt?: string;
}) {
  return `
Use the provided 3D reference image and scene data as the single SOURCE OF TRUTH.

ROLE & OBJECTIVE:
* Three.js 3D Engine = Ground-truth geometry + exact positions + room dimensions + camera perspective.
* AI = Visual Realism Layer (textures, physical materials, realistic lighting, shadows, and architectural decor).

STRICT PRESERVATION RULES:
1. Strictly preserve the exact camera angle, perspective, room dimensions, wall boundaries, and door/window openings defined by the 3D scene.
2. Strictly preserve the exact position, orientation, scale, and placement of every piece of furniture, appliance, and cabinet shown.
3. Do NOT move, delete, invent, or hallucinate walls, doors, windows, or unrelated rooms.
4. Do NOT alter the architectural proportions or geometry.

VISUAL REALISM & MATERIALS:
* Transform the scene into a high-end real-estate architectural visualization.
* Style: ${styleDescription}
* Lighting: ${lightingDescription}
* Convert basic 3D geometry into tangible physical materials: authentic wood grains, polished Calacatta marble, brushed architectural metals, realistic fabric weaves, and glass reflections.
* Apply physically plausible global illumination, natural shadows, and sharp raytraced highlights.

CRITICAL RULE FOR DOORS, WINDOWS, AND OPENINGS (VÃOS):
- Through all door openings, windows, and open passageways, render a realistic, naturally illuminated adjoining environment (such as an adjoining sunlit living room, modern architectural corridor/hallway, outdoor landscaped garden with greenery, or bright ambient exterior daylight).
- NEVER leave door openings, windows, or wall cutouts as pitch-black empty voids, black walls, or dark holes. The space beyond every doorway must look like a real, connected, naturally lit architectural space or garden.
${customPrompt?.trim() ? `* Client Special Instructions: ${customPrompt.trim()}` : ''}

3D SCENE DATA (JSON):
${JSON.stringify(sceneJson, null, 2)}

OUTPUT:
A clean, photorealistic architectural render with 100% spatial fidelity to the 3D scene. Zero watermarks, zero text overlays, zero UI elements.
`.trim();
}

/**
 * Specialized 360-Degree Equirectangular Panoramic Prompt
 * Formatted specifically for VR / Three.js 360-degree spherical viewers.
 */
function createEquirectangular360Prompt({
  sceneJson,
  styleDescription,
  lightingDescription,
  customPrompt,
}: {
  sceneJson?: any;
  styleDescription?: string;
  lightingDescription?: string;
  customPrompt?: string;
}) {
  return `
Create a photorealistic 360° equirectangular architectural panorama.

CRITICAL REQUIREMENT - SEAMLESS 360° LOOP:
The LEFT EDGE and RIGHT EDGE of the final image MUST represent the exact same continuous environment.

The panorama is a seamless horizontal loop:
The far-right pixels must continue naturally into the far-left pixels with NO visible seam, discontinuity, duplicated object, sudden change in perspective, lighting mismatch, geometry mismatch or texture break.

Imagine the image wrapped around a 360° cylinder and viewed from inside.

REQUIREMENTS:
1. True 360° horizontal environment.
2. Equirectangular composition with 2:1 aspect ratio.
3. The horizontal axis is cyclic and must wrap seamlessly.
4. Ensure perfect visual continuity between the first and last columns of pixels.
5. Maintain consistent perspective, lighting, shadows, materials and architectural geometry across the entire 360°.
6. Do NOT place important objects directly across the left/right boundary unless they naturally continue across it.
7. Do NOT mirror the image.
8. Do NOT duplicate furniture or architectural elements to create the seam.
9. Do NOT create a visible transition at the boundary.
10. The ceiling and floor must also remain spatially consistent throughout the panorama.
11. Preserve doors, windows, openings and architectural proportions from the reference.


DO NOT redesign the scene.
DO NOT change the architecture.
DO NOT change the furniture.
DO NOT change the camera perspective.
DO NOT change the lighting style.

The ONLY objective is to fix the horizontal panorama seam.

The LEFT and RIGHT edges of the image represent adjacent points of the same 360° environment and MUST connect perfectly.

Treat the image as a continuous horizontal loop.

SEAM REQUIREMENTS:

Analyze the visual information at the extreme LEFT edge.
Analyze the visual information at the extreme RIGHT edge.
Continue the architecture, walls, floor, ceiling, furniture, lighting and textures naturally across the boundary.
Eliminate any visible discontinuity between the RIGHT edge and LEFT edge.
Match perspective, scale, lighting, color, shadows and texture across the seam.
If an object is partially visible near one edge, continue that same object naturally from the opposite edge.
Do not duplicate objects.
Do not mirror objects.
Do not create a new architectural structure at the seam.
Do not blur the entire image to hide the transition.

IMPORTANT:

Imagine physically wrapping the image around a cylinder and placing the RIGHT edge directly against the LEFT edge.

The observer must be able to rotate continuously through 360° without noticing where the image begins or ends.

The final panorama must behave as a SINGLE CONTINUOUS ENVIRONMENT.

Only modify pixels necessary to create a seamless transition. Preserve everything else.


CRITICAL HORIZONTAL ALIGNMENT (ZERO VERTICAL OFFSET):
  
- The ceiling line, LED cove light, and floor baseboard MUST meet at the EXACT same Y-pixel height on both the far-left edge (x=0) and far-right edge (x=width).
- There must be ZERO vertical shift, jump, or step between the left and right ends of the LED strip, ceiling, and floor.
- Both edges must share the exact same exposure, brightness, and color temperature.

Output:
A photorealistic seamless 360° equirectangular panorama, 2:1 aspect ratio, ready to be used directly as an A-Frame <a-sky> texture.




CRITICAL RULE FOR DOORS, WINDOWS, AND OPENINGS (VÃOS):
- Through all door openings, windows, and open passageways, render a realistic, naturally illuminated adjoining environment (such as an adjoining sunlit living room, modern architectural corridor/hallway, outdoor landscaped garden with greenery, or bright ambient exterior daylight).
- NEVER leave door openings, windows, or wall cutouts as pitch-black empty voids, black walls, or dark holes. The space beyond every doorway must look like a real, connected, naturally lit architectural space or garden.

FINAL TEST:
Imagine placing the right edge directly next to the left edge: they must look like two adjacent sections of the same photograph, with zero visible transition.
The resulting image will be used directly as a 360° texture inside a Three.js / WebGL / A-Frame spherical viewer.

STYLE & MATERIALS:
* Style: ${styleDescription}
* Lighting: ${lightingDescription}
* Photorealistic materials: authentic wood grains, polished Calacatta marble, brushed metals, luxury upholstery, and subtle glass reflections.
* Physically plausible global illumination and natural photon bounces.
${customPrompt?.trim() ? `* Client Special Requests: ${customPrompt.trim()}` : ''}

3D SCENE DATA (JSON):
${JSON.stringify(sceneJson, null, 2)}

OUTPUT:
A clean, seamless, photorealistic 360° equirectangular panoramic master render, zero watermarks, zero borders, zero graphic overlays.
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body: RenderRequest = await req.json();
    const {
      imageBase64,
      renderType = 'normal',
      engine = 'openai',
      styleId = 'luxury-modern',
      lightingId = 'daylight',
      customPrompt = '',
      sceneJson,
      roomInfo,
      userApiKey,
      model = 'gpt-image-1.5',
    } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Nenhuma imagem enviada para renderização.' },
        { status: 400 }
      );
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    const imageBuffer = Buffer.from(cleanBase64, 'base64');
    const mimeType = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,/)?.[1] || 'image/png';

    const selectedStyle = STYLE_PROMPTS[styleId] || STYLE_PROMPTS['luxury-modern'];
    const selectedLighting = LIGHTING_PROMPTS[lightingId] || LIGHTING_PROMPTS['daylight'];

    // Assemble comprehensive Scene JSON if not provided directly
    const fullSceneJson = sceneJson || {
      room: {
        type: roomInfo?.roomType || 'Living / Cozinha Gourmet',
        width: roomInfo?.width || 6.0,
        depth: roomInfo?.depth || 5.0,
        height: roomInfo?.height || 2.8,
        materials: roomInfo?.materialsSummary || 'Porcelanato e paredes acetinadas',
      },
      renderType,
      requestedStyle: selectedStyle,
      requestedLighting: selectedLighting,
    };

    const is360 = renderType === '360';
    const architecturalPrompt = is360
      ? createEquirectangular360Prompt({
        sceneJson: fullSceneJson,
        styleDescription: selectedStyle,
        lightingDescription: selectedLighting,
        customPrompt,
      })
      : createNormalArchitecturalPrompt({
        sceneJson: fullSceneJson,
        styleDescription: selectedStyle,
        lightingDescription: selectedLighting,
        customPrompt,
      });

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER: OpenAI Image Execution
    // ─────────────────────────────────────────────────────────────────────────────
    const runOpenAi = async (): Promise<NextResponse | null> => {
      const openaiApiKey =
        (userApiKey?.startsWith('sk-') ? userApiKey.trim() : null) ||
        process.env.OPENAI_API_KEY ||
        process.env.OPENAI_KEY;

      if (!openaiApiKey) return null;

      console.log(`[Render AI] Running OpenAI (${model}) for renderType=${renderType}`);
      const openai = new OpenAI({ apiKey: openaiApiKey });

      const imageFile = await toFile(imageBuffer, is360 ? 'equirectangular_360.png' : 'scene_reference.png', {
        type: 'image/png',
      });

      const candidateModels = [
        model,
        'gpt-image-1.5',
        'gpt-image-1',
        'chatgpt-image-latest',
      ].filter((v, i, a) => a.indexOf(v) === i);

      for (const m of candidateModels) {
        try {
          console.log(`[Render AI] Attempting OpenAI model: ${m}...`);
          const result = await openai.images.edit({
            model: m,
            image: imageFile,
            prompt: architecturalPrompt,
            size: is360 ? '1536x1024' : '1536x1024',
            quality: 'high',
            output_format: 'png',
          });

          const base64Data = result.data?.[0]?.b64_json;
          const imageUrl = result.data?.[0]?.url;

          if (base64Data) {
            return NextResponse.json({
              renderedImageUrl: `data:image/png;base64,${base64Data}`,
              promptUsed: architecturalPrompt,
              engine: `OpenAI ${m}`,
              renderType,
            });
          } else if (imageUrl) {
            return NextResponse.json({
              renderedImageUrl: imageUrl,
              promptUsed: architecturalPrompt,
              engine: `OpenAI ${m}`,
              renderType,
            });
          }
        } catch (openaiErr: any) {
          console.warn(`[Render AI] Model ${m} error:`, openaiErr?.status, openaiErr?.message || openaiErr);
        }
      }
      return null;
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // HELPER: Gemini Multimodal Execution
    // ─────────────────────────────────────────────────────────────────────────────
    let lastGeminiError: string | null = null;
    const runGemini = async (): Promise<NextResponse | null> => {
      const geminiKey =
        (userApiKey && !userApiKey.startsWith('sk-') ? userApiKey.trim() : null) ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_AI_KEY;

      if (!geminiKey) return null;

      console.log(`[Render AI] Running Gemini Multimodal for renderType=${renderType}`);
      const geminiModels = [
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash-image',
        'gemini-3-pro-image',
        'gemini-3.1-flash-image',
      ];

      for (const modelName of geminiModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: architecturalPrompt },
                    {
                      inlineData: {
                        mimeType,
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                temperature: 0.2,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const parts = data?.candidates?.[0]?.content?.parts || [];

            for (const part of parts) {
              const inlineData = part.inlineData || part.inline_data;
              if (inlineData?.data) {
                const outMime = inlineData.mimeType || inlineData.mime_type || 'image/png';
                return NextResponse.json({
                  renderedImageUrl: `data:${outMime};base64,${inlineData.data}`,
                  promptUsed: architecturalPrompt,
                  engine: `Google Gemini (${modelName})`,
                  renderType,
                });
              }
            }
          } else {
            const errData = await response.json().catch(() => null);
            lastGeminiError = errData?.error?.message || `HTTP ${response.status}`;
            console.warn(`[Render AI] Gemini model ${modelName} returned status ${response.status}:`, lastGeminiError);
          }
        } catch (gemErr: any) {
          lastGeminiError = gemErr?.message || String(gemErr);
          console.warn(`[Render AI] Gemini model ${modelName} error:`, gemErr);
        }
      }

      return null;
    };

    // Priority execution based on engine param
    if (engine === 'gemini') {
      const geminiRes = await runGemini();
      if (geminiRes) return geminiRes;
      if (lastGeminiError) {
        return NextResponse.json(
          {
            error: `Erro na API do Google Gemini: ${lastGeminiError}`,
            engine: 'gemini',
          },
          { status: 429 }
        );
      }
      const openaiRes = await runOpenAi();
      if (openaiRes) return openaiRes;
    } else {
      const openaiRes = await runOpenAi();
      if (openaiRes) return openaiRes;
      const geminiRes = await runGemini();
      if (geminiRes) return geminiRes;
    }

    return NextResponse.json(
      {
        error: 'Chave da API da OpenAI ou Google Gemini não configurada ou inválida.',
        needsApiKey: true,
        message: 'Configure sua chave OPENAI_API_KEY ou GEMINI_API_KEY para gerar renders fotorrealistas.',
      },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('API /api/render-ai error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erro interno ao processar renderização arquitetônica.',
      },
      { status: 500 }
    );
  }
}
