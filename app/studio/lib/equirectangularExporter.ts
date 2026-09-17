import * as THREE from 'three';

const EQUIRECT_VERTEX_SHADER = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.x, position.y, 0.0, 1.0);
}
`;

const EQUIRECT_FRAGMENT_SHADER = `
precision highp float;
precision highp samplerCube;
uniform samplerCube tCube;
in vec2 vUv;
out vec4 fragColor;
#define PI 3.14159265358979323846

void main() {
  // vUv.x in [0, 1] -> longitude theta in [-PI, PI]
  // vUv.y in [0, 1] -> latitude phi in [0, PI] (0 = top/zenith, PI = bottom/nadir)
  float theta = (vUv.x - 0.5) * 2.0 * PI;
  float phi = (1.0 - vUv.y) * PI;

  float sinPhi = sin(phi);
  float cosPhi = cos(phi);
  float sinTheta = sin(theta);
  float cosTheta = cos(theta);

  // Direction vector in 3D cubemap space
  vec3 dir = normalize(vec3(-sinPhi * sinTheta, cosPhi, -sinPhi * cosTheta));

  vec4 col = texture(tCube, dir);
  fragColor = vec4(col.rgb, 1.0);
}
`;

export interface PanoramaCaptureOptions {
  width?: number; // Default: 4096
  height?: number; // Default: 2048
  cubeSize?: number; // Default: 2048
  position?: THREE.Vector3;
  format?: 'image/jpeg' | 'image/png';
  quality?: number; // 0.0 to 1.0, default: 0.95
}

export function captureEquirectangularPanorama(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  options: PanoramaCaptureOptions = {}
): string {
  const width = options.width || 4096;
  const height = options.height || 2048;
  const cubeSize = options.cubeSize || 2048;
  const position = options.position || new THREE.Vector3(0, 1.55, 0);
  const format = options.format || 'image/jpeg';
  const quality = options.quality ?? 0.95;

  console.log('[360 Panorama] Starting capture at position:', position, `Resolution: ${width}x${height}`);

  // 1. Setup Cube Render Target & Camera
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(cubeSize, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace,
  });

  const cubeCamera = new THREE.CubeCamera(0.05, 1000, cubeRenderTarget);
  cubeCamera.position.copy(position);
  cubeCamera.updateMatrixWorld(true);
  scene.add(cubeCamera);

  // Ensure entire scene hierarchy has updated matrices
  scene.updateMatrixWorld(true);

  // 2. Render 6-face Cubemap from viewpoint
  cubeCamera.update(renderer, scene);
  scene.remove(cubeCamera);

  // 3. Setup Offscreen Equirectangular Pass
  const equirectRenderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace,
  });

  const dummyCamera = new THREE.Camera();
  const orthoScene = new THREE.Scene();

  const planeGeo = new THREE.PlaneGeometry(2, 2);
  const shaderMat = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      tCube: { value: cubeRenderTarget.texture },
    },
    vertexShader: EQUIRECT_VERTEX_SHADER,
    fragmentShader: EQUIRECT_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(planeGeo, shaderMat);
  orthoScene.add(quad);

  // 4. Render Equirectangular Projection to RenderTarget
  const prevRenderTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(equirectRenderTarget);
  renderer.clear();
  renderer.render(orthoScene, dummyCamera);
  renderer.setRenderTarget(prevRenderTarget);

  // 5. Read back pixels to Canvas
  const buffer = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(equirectRenderTarget, 0, 0, width, height, buffer);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cubeRenderTarget.dispose();
    equirectRenderTarget.dispose();
    planeGeo.dispose();
    shaderMat.dispose();
    return '';
  }

  // WebGL readPixels returns image upside-down (bottom-to-top). Flip rows.
  const imgData = ctx.createImageData(width, height);
  const rowSize = width * 4;
  for (let y = 0; y < height; y++) {
    const srcOffset = (height - 1 - y) * rowSize;
    const dstOffset = y * rowSize;
    imgData.data.set(buffer.subarray(srcOffset, srcOffset + rowSize), dstOffset);
  }
  ctx.putImageData(imgData, 0, 0);

  const dataUrl = canvas.toDataURL(format, quality);
  console.log('[360 Panorama] Generated DataURL length:', dataUrl.length);

  // 6. Dispose GPU resources
  cubeRenderTarget.dispose();
  equirectRenderTarget.dispose();
  planeGeo.dispose();
  shaderMat.dispose();

  return dataUrl;
}
