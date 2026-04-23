import { useEffect, useRef } from "react";

/**
 * AntigravityParticles — Red glowing floating particles
 * inspired by Google Antigravity website animation.
 * Particles drift, float, and glow with red hues on dark bg.
 */
export default function AntigravityParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let W = window.innerWidth;
    let H = window.innerHeight;
    let animId;

    canvas.width = W;
    canvas.height = H;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", resize);

    // Particle types matching Antigravity: dashes, dots, small rects
    const COLORS = [
      "rgba(220,38,38,",
      "rgba(239,68,68,",
      "rgba(185,28,28,",
      "rgba(248,113,113,",
      "rgba(153,27,27,",
      "rgba(252,165,165,",
    ];

    const TYPES = ["dash", "dot", "rect"];

    class Particle {
      constructor() { this.reset(true); }
      reset(init = false) {
        this.x = Math.random() * W;
        this.y = init ? Math.random() * H : H + 20;
        this.type = TYPES[Math.floor(Math.random() * TYPES.length)];
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.alpha = Math.random() * 0.55 + 0.1;
        this.alphaTarget = Math.random() * 0.55 + 0.15;
        this.alphaDelta = (Math.random() * 0.008 + 0.002) * (Math.random() < 0.5 ? 1 : -1);
        this.size = Math.random() * 3.5 + 1.2;
        this.length = Math.random() * 14 + 6; // for dash
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.015;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -(Math.random() * 0.5 + 0.2);
        this.glow = Math.random() > 0.65;
        this.glowSize = Math.random() * 8 + 4;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotSpeed;
        this.alpha += this.alphaDelta;
        if (this.alpha <= 0.05 || this.alpha >= 0.7) {
          this.alphaDelta *= -1;
          this.alpha = Math.max(0.05, Math.min(0.7, this.alpha));
        }
        if (this.y < -30 || this.x < -60 || this.x > W + 60) this.reset();
      }
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = this.alpha;

        if (this.glow) {
          ctx.shadowColor = this.color + "0.9)";
          ctx.shadowBlur = this.glowSize;
        }

        ctx.fillStyle = this.color + this.alpha + ")";
        ctx.strokeStyle = this.color + this.alpha + ")";

        if (this.type === "dot") {
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (this.type === "dash") {
          ctx.lineWidth = this.size * 0.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-this.length / 2, 0);
          ctx.lineTo(this.length / 2, 0);
          ctx.stroke();
        } else {
          const w = this.size * 1.4;
          const h = this.size * 0.65;
          ctx.fillRect(-w / 2, -h / 2, w, h);
        }
        ctx.restore();
      }
    }

    // Create particles — more density like Antigravity
    const COUNT = Math.min(220, Math.floor((W * H) / 6000));
    const particles = Array.from({ length: COUNT }, () => new Particle());

    let mouse = { x: W / 2, y: H / 2 };
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener("mousemove", onMove);

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      // Subtle radial red glow at mouse pos
      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 320);
      grad.addColorStop(0, "rgba(220,38,38,0.06)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      particles.forEach((p) => {
        // Gentle mouse attraction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const force = (180 - dist) / 180 * 0.008;
          p.vx += dx * force;
          p.vy += dy * force;
          // cap speed
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd > 1.8) { p.vx *= 1.8 / spd; p.vy *= 1.8 / spd; }
        }
        p.update();
        p.draw(ctx);
      });

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.85,
      }}
      aria-hidden="true"
    />
  );
}
