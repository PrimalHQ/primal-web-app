import { createEffect, onCleanup } from 'solid-js';
import './LightningFlash.module.scss';

interface LightningFlashProps {
  duration?: number; // in milliseconds
  active?: boolean;
}

const LightningFlash = (props: LightningFlashProps) => {
  const duration = () => props.duration || 1000;
  const active = () => props.active !== undefined ? props.active : true;

  let svgRef: SVGSVGElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let timerRef: number | null = null;

  // Generate a lightning bolt based on the codepen example
  const generateLightning = () => {
    if (!svgRef || !containerRef) {
      return;
    }

    const svg = svgRef;
    const container = containerRef;
    const ancho = container.clientWidth;
    const altura = container.clientHeight;

    // Calculate a safe starting position that's not too close to the edges
    const safeWidthStart = ancho * 0.15;
    const safeWidthEnd = ancho * 0.85;
    const safeWidth = safeWidthEnd - safeWidthStart;

    const xInicio = safeWidthStart + Math.random() * safeWidth;
    let yActual = 0;
    let zigzag = `M${xInicio},${yActual}`;

    const grosor = Math.random() * 3 + 2;
    const color = Math.random() > 0.5 ? 'white' : 'yellow';

    // Create the zigzag pattern
    const segments = Math.floor(Math.random() * 3 + 5);

    for (let i = 0; i < segments; i++) {
      const maxOffset = Math.min(100, safeWidth * 0.25);
      const xOffset = (Math.random() - 0.5) * maxOffset;

      let yOffset;
      if (i === segments - 1) {
        yOffset = altura - yActual;
      } else {
        yOffset = (altura / segments) * (1 + Math.random() * 0.5);
      }

      yActual += yOffset;

      let newX = xInicio + xOffset;
      const edgeBuffer = ancho * 0.08;
      if (newX < edgeBuffer) newX = edgeBuffer;
      if (newX > ancho - edgeBuffer) newX = ancho - edgeBuffer;

      zigzag += ` L${newX},${yActual}`;

      // Add random branches
      if (Math.random() > 0.7) {
        const branchOffsetMax = maxOffset * 0.8;
        const branchOffset = (Math.random() - 0.5) * branchOffsetMax;
        let branchX = newX + branchOffset;

        const edgeBuffer = ancho * 0.05;
        if (branchX < edgeBuffer) branchX = edgeBuffer;
        if (branchX > ancho - edgeBuffer) branchX = ancho - edgeBuffer;

        const branchY = yActual + Math.random() * 30;
        zigzag += ` M${newX},${yActual} L${branchX},${branchY} M${newX},${yActual}`;
      }
    }

    // Create the SVG path element
    const linea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linea.setAttribute('d', zigzag);
    linea.setAttribute('class', 'rayo');
    linea.setAttribute('stroke', color);
    linea.setAttribute('stroke-width', grosor.toString());
    linea.setAttribute('fill', 'none');
    svg.appendChild(linea);

    // Add flash effect
    if (container) {
      container.classList.add('flash');
      window.setTimeout(() => {
        container.classList.remove('flash');
      }, 200);
    }

    // Clean up the lightning after animation
    window.setTimeout(() => {
      if (svg.contains(linea)) {
        svg.removeChild(linea);
      }
    }, 800);
  };

  createEffect(() => {
    const isActive = active();

    if (!isActive) return;

    // Wait for refs to be available, then generate lightning
    const checkAndGenerate = () => {
      if (svgRef && containerRef) {
        generateLightning();
      } else {
        // Retry on next frame if refs aren't ready yet
        requestAnimationFrame(checkAndGenerate);
      }
    };

    checkAndGenerate();

    // Cleanup
    timerRef = window.setTimeout(() => {
      // Cleanup will happen naturally as each bolt removes itself
    }, duration());
  });

  onCleanup(() => {
    if (timerRef !== null) {
      window.clearTimeout(timerRef);
    }
  });

  return (
    <div ref={containerRef} class="lightning-container">
      <svg ref={svgRef} class="lightning-svg"></svg>
    </div>
  );
};

export default LightningFlash;
