const canvas = document.getElementById("backdrop");
const ctx = canvas.getContext("2d");

const state = {
  width: 0,
  height: 0,
  particles: [],
  pointer: { x: 0, y: 0, active: false },
};

const CONFIG = {
  count: 500,
  dotRadius: 1.1,
  lineDistance: 110,
  pointerRadius: 160,
  repelStrength: 0.6,
  springStrength: 0.015,
  friction: 0.92,
};

const rand = (min, max) => Math.random() * (max - min) + min;

function resize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = state.width * window.devicePixelRatio;
  canvas.height = state.height * window.devicePixelRatio;
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  state.particles = createParticles();
}

function createParticles() {
  const particles = [];
  for (let i = 0; i < CONFIG.count; i += 1) {
    particles.push({
      x: rand(0, state.width),
      y: rand(0, state.height),
      baseX: 0,
      baseY: 0,
      vx: rand(-0.2, 0.2),
      vy: rand(-0.2, 0.2),
    });
  }
  for (const particle of particles) {
    particle.baseX = particle.x;
    particle.baseY = particle.y;
  }
  return particles;
}

function updateParticle(particle) {
  const springX = (particle.baseX - particle.x) * CONFIG.springStrength;
  const springY = (particle.baseY - particle.y) * CONFIG.springStrength;

  particle.vx += springX;
  particle.vy += springY;

  if (state.pointer.active) {
    const dx = particle.x - state.pointer.x;
    const dy = particle.y - state.pointer.y;
    const dist = Math.hypot(dx, dy);
    if (dist < CONFIG.pointerRadius && dist > 0.1) {
      const force = (CONFIG.pointerRadius - dist) / CONFIG.pointerRadius;
      particle.vx += (dx / dist) * force * CONFIG.repelStrength;
      particle.vy += (dy / dist) * force * CONFIG.repelStrength;
    }
  }

  particle.vx *= CONFIG.friction;
  particle.vy *= CONFIG.friction;

  particle.x += particle.vx;
  particle.y += particle.vy;

  if (particle.x < 0 || particle.x > state.width) {
    particle.vx *= -1;
  }
  if (particle.y < 0 || particle.y > state.height) {
    particle.vy *= -1;
  }
}

function draw() {
  ctx.clearRect(0, 0, state.width, state.height);

  for (const particle of state.particles) {
    updateParticle(particle);
  }

  ctx.strokeStyle = "rgba(30, 30, 30, 0.2)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < state.particles.length; i += 1) {
    const p1 = state.particles[i];
    for (let j = i + 1; j < state.particles.length; j += 1) {
      const p2 = state.particles[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.hypot(dx, dy);
      if (dist < CONFIG.lineDistance) {
        const alpha = 1 - dist / CONFIG.lineDistance;
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(20, 20, 20, 0.7)";
  for (const particle of state.particles) {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, CONFIG.dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

function handlePointer(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointer.x = event.clientX - rect.left;
  state.pointer.y = event.clientY - rect.top;
  state.pointer.active = true;
}

function clearPointer() {
  state.pointer.active = false;
}

window.addEventListener("resize", resize);
window.addEventListener("mousemove", handlePointer);
window.addEventListener("mouseleave", clearPointer);
window.addEventListener("touchmove", (event) => {
  if (event.touches.length > 0) {
    handlePointer(event.touches[0]);
  }
});
window.addEventListener("touchend", clearPointer);

resize();
draw();
