import * as THREE from 'three';

export type PresetArtType = 'rosetta' | 'flower' | 'heart' | 'swan' | 'text';

/**
 * Creates custom barista milk foam text projected directly onto the coffee.
 * Rendered with extra-bold thick milk foam lettering, feathered caramel halos, and cocoa stencil accents.
 */
export function createLatteArtTextTexture(
  line1: string = 'Amo ❤️',
  line2: string = 'Café'
): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 512;
  const cy = 512;

  // 1. BASE WARM TOFFEE & CINNAMON CREMA
  const bgGrad = ctx.createRadialGradient(cx - 30, cy - 20, 50, cx, cy, 512);
  bgGrad.addColorStop(0, '#c7783d');     // Golden-honey crema center
  bgGrad.addColorStop(0.35, '#a45524');  // Toffee/cinnamon rich crema
  bgGrad.addColorStop(0.70, '#783514');  // Deep terracotta roast
  bgGrad.addColorStop(0.90, '#4d1e0a');  // Dark roasted border
  bgGrad.addColorStop(1, '#2c0e04');     // Meniscus edge
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. CREMA CURRENTS & TIGER STRIPING
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const radius = 150 + (i % 7) * 48;
    const sx = cx + Math.cos(angle) * radius;
    const sy = cy + Math.sin(angle) * radius;
    const swirlGrad = ctx.createRadialGradient(sx, sy, 5, sx, sy, 160);
    swirlGrad.addColorStop(0, '#e5934c');
    swirlGrad.addColorStop(0.55, '#a64f1d');
    swirlGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = swirlGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, 160, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. FINE POWDERED CINNAMON / COCOA DUSTING
  ctx.save();
  for (let i = 0; i < 2000; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    const dist = Math.hypot(rx - cx, ry - cy);
    if (dist < 500) {
      const r = Math.random() * 1.6 + 0.3;
      const alpha = Math.random() * 0.14 + 0.02;
      ctx.fillStyle = (Math.random() > 0.35)
        ? `rgba(255, 248, 235, ${alpha})`
        : `rgba(75, 28, 9, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 4. EXTRA-BOLD BARISTA MILK FOAM TYPOGRAPHY (SEM BORDA / 25% TRANSPARÊNCIA COM O CAFÉ)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dynamic large font sizes
  const fontSize1 = Math.min(130, Math.floor(820 / Math.max(line1.length, 5)));
  const fontSize2 = Math.min(150, Math.floor(820 / Math.max(line2.length, 4)));

  const y1 = line2 ? -90 : 0;
  const y2 = 95;

  const fontString1 = `900 italic ${fontSize1}px "Arial Black", "Montserrat", "Impact", "Inter", sans-serif`;
  const fontString2 = `900 ${fontSize2}px "Arial Black", "Montserrat", "Impact", "Inter", sans-serif`;

  // Soft natural milk diffusion (sem contornos escuros ou bordas artificiais)
  ctx.shadowColor = 'rgba(255, 245, 230, 0.40)';
  ctx.shadowBlur = 16;

  // Cor do leite vaporizado com 25% de transparência (75% de opacidade do leite mesclando com o café)
  ctx.fillStyle = 'rgba(255, 252, 246, 0.75)';

  if (line1) {
    ctx.font = fontString1;
    ctx.fillText(line1, 0, y1);
  }
  if (line2) {
    ctx.font = fontString2;
    ctx.fillText(line2, 0, y2);
  }

  // Coração sem borda, suavemente integrado ao café com 25% de transparência
  if (line2) {
    const heartY = 215;
    const hGrad = ctx.createRadialGradient(0, heartY - 5, 5, 0, heartY, 45);
    hGrad.addColorStop(0, 'rgba(255, 255, 255, 0.80)');
    hGrad.addColorStop(0.65, 'rgba(255, 245, 230, 0.75)');
    hGrad.addColorStop(0.90, 'rgba(235, 160, 90, 0.40)');
    hGrad.addColorStop(1, 'transparent');

    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 245, 230, 0.35)';
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.moveTo(0, heartY + 30);
    ctx.bezierCurveTo(-38, heartY + 8, -42, heartY - 28, 0, heartY - 14);
    ctx.bezierCurveTo(42, heartY - 28, 38, heartY + 8, 0, heartY + 30);
    ctx.fill();
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural authentic barista fluid-pour latte art generator.
 */
export function createLatteArtTexture(type: PresetArtType): THREE.CanvasTexture {
  if (type === 'text') {
    return createLatteArtTextTexture('Bom dia!', 'Te Amo ❤️');
  }

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const cx = 512;
  const cy = 512;

  // 1. BASE WARM TOFFEE & CINNAMON CREMA
  const bgGrad = ctx.createRadialGradient(cx - 30, cy - 20, 50, cx, cy, 512);
  bgGrad.addColorStop(0, '#c7783d');
  bgGrad.addColorStop(0.35, '#a45524');
  bgGrad.addColorStop(0.70, '#783514');
  bgGrad.addColorStop(0.90, '#4d1e0a');
  bgGrad.addColorStop(1, '#2c0e04');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. CREMA MARBLING & TIGER STRIPING
  ctx.save();
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const radius = 150 + (i % 7) * 48;
    const sx = cx + Math.cos(angle) * radius;
    const sy = cy + Math.sin(angle) * radius;
    const swirlGrad = ctx.createRadialGradient(sx, sy, 5, sx, sy, 160);
    swirlGrad.addColorStop(0, '#e5934c');
    swirlGrad.addColorStop(0.55, '#a64f1d');
    swirlGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = swirlGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, 160, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. FINE POWDERED CINNAMON / COCOA & FOAM DUSTING
  ctx.save();
  for (let i = 0; i < 2200; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    const dist = Math.hypot(rx - cx, ry - cy);
    if (dist < 500) {
      const r = Math.random() * 1.6 + 0.3;
      const alpha = Math.random() * 0.15 + 0.02;
      ctx.fillStyle = (Math.random() > 0.35)
        ? `rgba(255, 248, 235, ${alpha})`
        : `rgba(75, 28, 9, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 4. FLUID-POUR LATTE ART
  if (type === 'rosetta') {
    // ☕ WINGED ROSETTA / TULIP
    ctx.save();
    ctx.translate(cx + 10, cy + 50);

    const totalWings = 14;

    for (let i = totalWings - 1; i >= 0; i--) {
      const t = i / (totalWings - 1);
      const yPos = 220 - (1.0 - t) * 440;
      const span = (1.0 - t * 0.6) * 380;
      const wingHeight = 42 + (1.0 - t) * 30;

      ctx.save();
      const haloGrad = ctx.createRadialGradient(0, yPos, 10, 0, yPos, span * 1.15);
      haloGrad.addColorStop(0, 'rgba(245, 195, 145, 0.65)');
      haloGrad.addColorStop(0.5, 'rgba(180, 95, 38, 0.45)');
      haloGrad.addColorStop(0.85, 'rgba(110, 48, 16, 0.2)');
      haloGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.moveTo(-span * 1.08, yPos - wingHeight * 0.6);
      ctx.bezierCurveTo(-span * 0.6, yPos + wingHeight * 0.9, -span * 0.2, yPos + wingHeight * 1.1, 0, yPos + wingHeight * 0.6);
      ctx.bezierCurveTo(span * 0.2, yPos + wingHeight * 1.1, span * 0.6, yPos + wingHeight * 0.9, span * 1.08, yPos - wingHeight * 0.6);
      ctx.bezierCurveTo(span * 0.7, yPos - wingHeight * 0.2, -span * 0.7, yPos - wingHeight * 0.2, -span * 1.08, yPos - wingHeight * 0.6);
      ctx.fill();
      ctx.restore();

      ctx.save();
      const milkGrad = ctx.createRadialGradient(0, yPos - 5, 5, 0, yPos, span);
      milkGrad.addColorStop(0, '#ffffff');
      milkGrad.addColorStop(0.55, '#fffbf2');
      milkGrad.addColorStop(0.82, '#fceddc');
      milkGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = milkGrad;
      ctx.beginPath();
      ctx.moveTo(-span, yPos - wingHeight * 0.5);
      ctx.bezierCurveTo(-span * 0.55, yPos + wingHeight * 0.75, -span * 0.15, yPos + wingHeight * 0.95, 0, yPos + wingHeight * 0.5);
      ctx.bezierCurveTo(span * 0.15, yPos + wingHeight * 0.95, span * 0.55, yPos + wingHeight * 0.75, span, yPos - wingHeight * 0.5);
      ctx.bezierCurveTo(span * 0.6, yPos - wingHeight * 0.1, -span * 0.6, yPos - wingHeight * 0.1, -span, yPos - wingHeight * 0.5);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    const topY = -280;
    const headGrad = ctx.createRadialGradient(0, topY, 10, 0, topY, 110);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.65, '#fff9f0');
    headGrad.addColorStop(0.88, '#f5deb8');
    headGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(0, topY + 70);
    ctx.bezierCurveTo(-85, topY + 20, -95, topY - 70, 0, topY - 30);
    ctx.bezierCurveTo(95, topY - 70, 85, topY + 20, 0, topY + 70);
    ctx.fill();
    ctx.restore();

    const cutGrad = ctx.createLinearGradient(0, -360, 0, 310);
    cutGrad.addColorStop(0, '#4a1b08');
    cutGrad.addColorStop(0.15, '#ffffff');
    cutGrad.addColorStop(0.70, '#fff6ec');
    cutGrad.addColorStop(0.92, '#b8632a');
    cutGrad.addColorStop(1, '#5a220c');

    ctx.strokeStyle = cutGrad;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -350);
    ctx.bezierCurveTo(-6, -100, 8, 100, 0, 300);
    ctx.stroke();

    const dropGrad = ctx.createRadialGradient(0, 295, 0, 0, 295, 18);
    dropGrad.addColorStop(0, '#a65220');
    dropGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = dropGrad;
    ctx.beginPath();
    ctx.arc(0, 295, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else if (type === 'flower') {
    // ☕ FLOR BARISTA COM ETCHING
    const petals = 8;
    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / petals);

      const petalGrad = ctx.createRadialGradient(0, -160, 10, 0, -160, 140);
      petalGrad.addColorStop(0, '#ffffff');
      petalGrad.addColorStop(0.55, '#fff6eb');
      petalGrad.addColorStop(0.85, '#eed0b4');
      petalGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = petalGrad;
      ctx.beginPath();
      ctx.ellipse(0, -160, 75, 125, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / petals);

      ctx.strokeStyle = '#280c04';
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.bezierCurveTo(-15, -160, 20, -260, 0, -320);
      ctx.stroke();

      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, -260);
      ctx.bezierCurveTo(-35, -280, -45, -310, -50, -330);
      ctx.moveTo(0, -260);
      ctx.bezierCurveTo(35, -280, 45, -310, 50, -330);
      ctx.stroke();

      ctx.restore();
    }

    const beanGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 65);
    beanGrad.addColorStop(0, '#351206');
    beanGrad.addColorStop(0.75, '#1e0903');
    beanGrad.addColorStop(1, '#52220d');

    ctx.fillStyle = beanGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 42, Math.PI / 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#0d0401';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-42, -5);
    ctx.bezierCurveTo(-15, 12, 15, -12, 42, 5);
    ctx.stroke();

    ctx.restore();
  } else if (type === 'heart') {
    // ☕ CORAÇÃO FLUIDO DERRAMADO
    ctx.save();
    ctx.translate(cx, cy + 20);

    for (let layer = 0; layer < 6; layer++) {
      const scale = 1.0 - layer * 0.12;
      const fluidGrad = ctx.createRadialGradient(0, -60 * scale, 10, 0, -20 * scale, 320 * scale);
      if (layer === 0) {
        fluidGrad.addColorStop(0, '#f5c89e');
        fluidGrad.addColorStop(0.5, '#c9783f');
        fluidGrad.addColorStop(0.85, '#853915');
        fluidGrad.addColorStop(1, 'transparent');
      } else {
        fluidGrad.addColorStop(0, '#ffffff');
        fluidGrad.addColorStop(0.6, '#fffaf2');
        fluidGrad.addColorStop(0.88, '#f7dfca');
        fluidGrad.addColorStop(1, 'transparent');
      }

      ctx.fillStyle = fluidGrad;
      ctx.beginPath();
      const topY = -120 * scale;
      const botY = 280 * scale;
      const leftW = -320 * scale;
      const rightW = 320 * scale;

      ctx.moveTo(0, botY);
      ctx.bezierCurveTo(leftW * 0.95, botY * 0.35, leftW * 1.05, topY * 1.9, 0, topY);
      ctx.bezierCurveTo(rightW * 1.05, topY * 1.9, rightW * 0.95, botY * 0.35, 0, botY);
      ctx.fill();
    }

    const pullGrad = ctx.createLinearGradient(0, -320, 0, 300);
    pullGrad.addColorStop(0, '#421608');
    pullGrad.addColorStop(0.2, '#ffffff');
    pullGrad.addColorStop(0.75, '#fff6ec');
    pullGrad.addColorStop(1, '#94441b');

    ctx.strokeStyle = pullGrad;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -310);
    ctx.bezierCurveTo(-4, -100, 4, 100, 0, 290);
    ctx.stroke();

    ctx.restore();
  } else {
    // 🦢 CISNE ELEGANTE
    ctx.save();
    ctx.translate(cx, cy + 50);

    for (let i = 0; i < 7; i++) {
      const yOffset = -i * 42;
      const width = (7 - i) * 40 + 50;

      const wingGrad = ctx.createRadialGradient(-50, yOffset, 0, -50, yOffset, width);
      wingGrad.addColorStop(0, '#ffffff');
      wingGrad.addColorStop(0.6, '#fff4e6');
      wingGrad.addColorStop(0.85, '#deb590');
      wingGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(-50, yOffset, width, 22, -Math.PI / 10, 0, Math.PI * 2);
      ctx.fill();
    }

    const baseGrad = ctx.createRadialGradient(-30, 80, 0, -30, 80, 110);
    baseGrad.addColorStop(0, '#ffffff');
    baseGrad.addColorStop(0.7, '#fdedde');
    baseGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.ellipse(-30, 80, 90, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    const neckGrad = ctx.createLinearGradient(0, 120, 40, -260);
    neckGrad.addColorStop(0, '#ffffff');
    neckGrad.addColorStop(0.6, '#fff9f0');
    neckGrad.addColorStop(1, '#ffffff');

    ctx.strokeStyle = neckGrad;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 120);
    ctx.bezierCurveTo(120, 40, 130, -220, 30, -260);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(30, -260, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eb9a34';
    ctx.beginPath();
    ctx.moveTo(46, -260);
    ctx.lineTo(95, -255);
    ctx.lineTo(46, -245);
    ctx.fill();

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
