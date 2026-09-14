/**
 * Advanced Photorealistic Coffee Shader:
 * - Strict Radial Alpha Mask: Exactly 0.0 bubbles in the central area (pristine smooth liquid).
 * - Noise-mixed Voronoi islands with UV warping for organic fluid foam in the outer collar.
 * - Latte art milk foam isolation (silky smooth milk foam without leather bump).
 * - Meniscus & internal ceramic wall ambient occlusion.
 */

export const coffeeVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWaveFrequency;
  uniform float uWaveAmplitude;
  uniform float uAnimateWaves;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vElevation;
  varying vec3 vViewPosition;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    vec2 centeredUv = uv - vec2(0.5);
    float dist = length(centeredUv);
    
    // Natural Meniscus curvature climbing at the ceramic cup wall
    float meniscus = smoothstep(0.36, 0.5, dist) * 0.020;
    pos.z += meniscus;

    float totalElevation = 0.0;
    vec3 calculatedNormal = vec3(0.0, 0.0, 1.0);

    if (uAnimateWaves > 0.5 && uWaveAmplitude > 0.0001) {
      float t = uTime * 1.1;
      float w1 = sin(dist * uWaveFrequency * 10.0 - t * 1.8) * uWaveAmplitude;
      float w2 = cos(centeredUv.x * 7.0 + t * 1.0) * sin(centeredUv.y * 7.0 + t * 0.8) * (uWaveAmplitude * 0.4);
      float w3 = sin((centeredUv.x * 9.0 + centeredUv.y * 9.0) - t * 1.4) * (uWaveAmplitude * 0.25);
      
      float edgeDamping = smoothstep(0.5, 0.42, dist);
      totalElevation = (w1 + w2 + w3) * edgeDamping;
      
      pos.z += totalElevation;

      float dDist = cos(dist * uWaveFrequency * 10.0 - t * 1.8) * (uWaveFrequency * 10.0) * uWaveAmplitude;
      vec2 grad = (centeredUv / max(dist, 0.001)) * dDist * edgeDamping;
      calculatedNormal = normalize(vec3(-grad.x, -grad.y, 1.0));
    }
    
    vElevation = totalElevation + meniscus;
    vPosition = pos;
    vNormal = normalize(normalMatrix * calculatedNormal);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const coffeeFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uMix;
  uniform vec2 uTile;
  uniform vec2 uOffset;
  uniform float uRotation;
  uniform vec3 uCoffeeColor;
  uniform vec3 uCremaColor;
  uniform float uVignetteRadius;
  uniform float uVignetteStrength;
  uniform float uTime;
  uniform float uLiquidDistortion;
  uniform float uAnimateWaves;
  uniform float uBubbleIntensity;
  uniform float uBubbleScale;
  uniform float uCenterClearRadius; // 0.0 to 1.0 (Strict zero-bubble central core)

  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vElevation;
  varying vec3 vViewPosition;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  float hash1(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Multi-return Voronoi Cellular Noise
  vec3 voronoi(vec2 x, float timeOffset) {
    vec2 n = floor(x);
    vec2 f = fract(x);

    vec2 mg, mr;
    float md = 8.0;
    float md2 = 8.0;

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        if (timeOffset > 0.0) {
          o = 0.5 + 0.35 * sin(timeOffset * 0.4 + 6.2831 * o);
        }
        vec2 r = g + o - f;
        float d = dot(r, r);

        if (d < md) {
          md2 = md;
          md = d;
          mr = r;
          mg = g;
        } else if (d < md2) {
          md2 = d;
        }
      }
    }
    return vec3(sqrt(md), sqrt(md2), hash1(n + mg));
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash1(i);
    float b = hash1(i + vec2(1.0, 0.0));
    float c = hash1(i + vec2(0.0, 1.0));
    float d = hash1(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.5 * noise(p); p *= 2.02;
    v += 0.25 * noise(p); p *= 2.03;
    v += 0.125 * noise(p);
    return v;
  }

  // Multi-Scale Voronoi with strict zero at center
  float getFoamHeight(vec2 uv, float t, float radialMask) {
    if (radialMask <= 0.0001) return 0.0;

    vec2 bubbleWarp = vec2(
      fbm(uv * 3.5 + vec2(0.0, t * 0.04)),
      fbm(uv * 3.5 + vec2(4.5, -t * 0.04))
    ) - vec2(0.5);
    vec2 warpedUv = uv + bubbleWarp * 0.07;

    float islandNoise = fbm(warpedUv * 2.8);
    float baseScale = max(uBubbleScale, 40.0) * (0.8 + islandNoise * 0.5);

    // Scale 1: Micro-foam crema
    vec3 v1 = voronoi(warpedUv * baseScale, t);
    float h1 = (1.0 - smoothstep(0.0, 0.7, v1.x)) * smoothstep(0.01, 0.18, v1.y - v1.x);

    // Scale 2: Medium foam clusters
    vec3 v2 = voronoi(warpedUv * (baseScale * 0.45), t * 0.7);
    float h2 = (1.0 - smoothstep(0.0, 0.75, v2.x)) * smoothstep(0.02, 0.22, v2.y - v2.x) * (0.4 + islandNoise * 0.6);

    // Scale 3: Macro bubble clusters concentrated in outer collar
    vec3 v3 = voronoi(warpedUv * (baseScale * 0.2), t * 0.4);
    float h3 = (1.0 - smoothstep(0.0, 0.82, v3.x)) * smoothstep(0.03, 0.3, v3.y - v3.x) * smoothstep(0.5, 0.95, radialMask);

    float combined = (h1 * 0.35 + h2 * 0.4 + h3 * 0.45);
    return combined * radialMask;
  }

  void main() {
    vec2 centeredUv = vUv - vec2(0.5);
    float dist = length(centeredUv);

    if (dist > 0.5) {
      discard;
    }

    float normalizedDist = dist / 0.5;

    // STRICT RADIAL ALPHA MASK FOR FOAM/BUBBLES
    // Central core (r < uCenterClearRadius) is guaranteed 100% pristine, smooth liquid
    float clearR = clamp(uCenterClearRadius, 0.1, 0.85);
    float radialFoamMask = smoothstep(clearR, 0.95, normalizedDist);
    
    // Modulate outer foam ring with organic fluid noise variations
    float clusterNoise = fbm(centeredUv * 4.2 + vec2(uTime * 0.01, -uTime * 0.01));
    radialFoamMask = clamp(radialFoamMask * (0.75 + clusterNoise * 0.5), 0.0, 1.0);

    // Absolute zero guarantee inside the clean central radius
    if (normalizedDist < clearR) {
      radialFoamMask = 0.0;
    }

    // 1. TRANSFORM UV FOR TILE, OFFSET & ROTATION
    vec2 baseUv = centeredUv;
    if (abs(uRotation) > 0.001) {
      float cosA = cos(uRotation);
      float sinA = sin(uRotation);
      baseUv = vec2(
        baseUv.x * cosA - baseUv.y * sinA,
        baseUv.x * sinA + baseUv.y * cosA
      );
    }
    vec2 texUv = (baseUv / max(uTile, vec2(0.01))) + vec2(0.5) - uOffset;

    // Fluid domain warping on projected latte art/text
    vec2 artWarp = vec2(
      fbm(texUv * 6.5 + vec2(uTime * 0.015, -uTime * 0.01)),
      fbm(texUv * 6.5 + vec2(3.7 + uTime * 0.01, 2.1 - uTime * 0.015))
    ) - vec2(0.5);
    vec2 fluidTexUv = texUv + artWarp * 0.035;

    vec4 texColor = vec4(0.0);
    if (fluidTexUv.x >= 0.0 && fluidTexUv.x <= 1.0 && fluidTexUv.y >= 0.0 && fluidTexUv.y <= 1.0) {
      texColor = texture2D(uTexture, fluidTexUv);
    } else {
      texColor = vec4(uCoffeeColor, 1.0);
    }

    // 2. ISOLAMENTO DA LATTE ART (Leite macio e sedoso sem relevo de bolhas)
    float milkLuminance = max(texColor.r, max(texColor.g, texColor.b));
    float milkMask = smoothstep(0.25, 0.85, milkLuminance) * uMix * texColor.a;
    float foamBumpSuppression = (1.0 - milkMask * 0.95);

    // 3. FOAM BUMP DERIVATIVES & NORMAL MAP
    float t = (uAnimateWaves > 0.5) ? uTime : 0.0;
    float eps = 0.0025;

    float hCenter = getFoamHeight(vUv, t, radialFoamMask);
    float hRight  = getFoamHeight(vUv + vec2(eps, 0.0), t, radialFoamMask);
    float hUp     = getFoamHeight(vUv + vec2(0.0, eps), t, radialFoamMask);

    float bIntensity = uBubbleIntensity * foamBumpSuppression * radialFoamMask;
    vec3 bubbleNormalLocal = vec3(0.0, 0.0, 1.0);

    if (radialFoamMask > 0.001) {
      bubbleNormalLocal = normalize(vec3(
        (hCenter - hRight) / eps * bIntensity * 0.14,
        (hCenter - hUp) / eps * bIntensity * 0.14,
        1.0
      ));
    }

    // Normal is 100% smooth vNormal in the center, and bumped only in the foam ring
    vec3 normal = normalize(vNormal + bubbleNormalLocal * (0.65 * radialFoamMask * foamBumpSuppression));
    vec3 viewDir = normalize(vViewPosition);

    // 4. BASE ESPRESSO & WARM CREMA (Medium Roast Palette)
    vec2 cremaCoords = centeredUv * 4.5;
    float turbulence = fbm(cremaCoords + vec2(uTime * 0.008, -uTime * 0.005));
    
    vec3 clearLiquidCenter = vec3(0.42, 0.18, 0.08); // Warm terracotta core (#6b2e14)
    vec3 mediumRoastRed    = vec3(0.55, 0.26, 0.11); // Cinnamon/hazelnut body (#8c421c)
    vec3 goldenCinnamon    = vec3(0.74, 0.40, 0.17); // Golden froth (#bd662b)
    vec3 brightAmberFroth  = vec3(0.88, 0.54, 0.25); // Rim foam highlights (#e08a40)
    vec3 deepReddishWall   = vec3(0.28, 0.10, 0.03); // Roasted border (#471a08)

    vec3 baseEspresso = mix(clearLiquidCenter, mediumRoastRed, smoothstep(0.0, 0.55, normalizedDist));
    baseEspresso = mix(baseEspresso, deepReddishWall, smoothstep(0.85, 1.0, normalizedDist));
    baseEspresso += (turbulence - 0.5) * 0.08 * (1.0 - radialFoamMask);

    // Apply collar foam color only where foam exists
    if (radialFoamMask > 0.001) {
      float cavity = smoothstep(0.12, 0.75, hCenter);
      vec3 foamColor = mix(goldenCinnamon, brightAmberFroth, cavity);
      baseEspresso = mix(baseEspresso, foamColor, radialFoamMask * 0.85);
    }

    // 5. BLEND WITH LATTE ART / TYPOGRAPHY
    vec3 milkFoamSilky = texColor.rgb;
    vec3 blendedLiquid = mix(baseEspresso, milkFoamSilky, uMix * texColor.a);

    // 6. SPECULAR REFLECTION (Smooth gloss on liquid center & milk, sparkles on bubble collar)
    vec3 lightDir1 = normalize(vec3(0.4, 0.9, 0.6));
    vec3 halfDir1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, halfDir1), 0.0), 32.0);

    vec3 lightDir2 = normalize(vec3(-0.5, 0.5, -0.4));
    vec3 halfDir2 = normalize(lightDir2 + viewDir);
    float spec2 = pow(max(dot(normal, halfDir2), 0.0), 16.0) * 0.3;

    float bubbleSpecular = pow(max(dot(normal, halfDir1), 0.0), 16.0) * hCenter * 0.35 * foamBumpSuppression * radialFoamMask;
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.5) * 0.25;

    vec3 totalSpecular = (vec3(1.0, 0.97, 0.92) * (spec1 * 0.36 + bubbleSpecular)) +
                         (vec3(0.9, 0.92, 1.0) * spec2 * 0.14) +
                         (vec3(1.0, 0.92, 0.82) * fresnel);

    blendedLiquid += totalSpecular;

    // 7. MENISCUS & INTERNAL WALL OCCLUSION
    float vignette = smoothstep(uVignetteRadius, 1.0, normalizedDist);
    float occlusion = 1.0 - (vignette * uVignetteStrength);
    float rimGlint = smoothstep(0.92, 0.98, normalizedDist) * smoothstep(1.0, 0.98, normalizedDist) * 0.26;

    vec3 finalColor = (blendedLiquid * occlusion) + (vec3(0.95, 0.75, 0.45) * rimGlint);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
