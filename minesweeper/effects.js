/* ==========================================================================
   Visual Effects Engine: Ambient Background Particles & Particle FX
   ========================================================================== */

class EffectsManager {
    constructor() {
        this.bgCanvas = document.getElementById('bg-canvas');
        this.bgCtx = this.bgCanvas ? this.bgCanvas.getContext('2d') : null;

        this.fxCanvas = document.getElementById('fx-canvas');
        this.fxCtx = this.fxCanvas ? this.fxCanvas.getContext('2d') : null;

        this.bgParticles = [];
        this.fxParticles = [];

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.initCanvases();
        this.createBgParticles();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    initCanvases() {
        if (!this.bgCanvas || !this.fxCanvas) return;
        this.bgCanvas.width = this.width;
        this.bgCanvas.height = this.height;
        this.fxCanvas.width = this.width;
        this.fxCanvas.height = this.height;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.initCanvases();
    }

    // Ambient floating background dots
    createBgParticles() {
        this.bgParticles = [];
        const count = Math.floor((this.width * this.height) / 18000);
        for (let i = 0; i < count; i++) {
            this.bgParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 2.5 + 0.5,
                alpha: Math.random() * 0.4 + 0.1,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
            });
        }
    }

    // Trigger mine explosion particle burst
    triggerExplosion(clientX, clientY) {
        if (!this.fxCtx) return;
        const count = 45;
        const colors = ['#ef4444', '#f97316', '#fbbf24', '#dc2626', '#1c1917'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;
            this.fxParticles.push({
                x: clientX,
                y: clientY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 5 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: Math.random() * 0.03 + 0.015,
                gravity: 0.15,
                shape: Math.random() > 0.5 ? 'circle' : 'square'
            });
        }
    }

    // Trigger victory confetti burst
    triggerConfetti() {
        if (!this.fxCtx) return;
        const count = 100;
        const colors = ['#38bdf8', '#34d399', '#f472b6', '#c084fc', '#fbbf24', '#6366f1'];

        for (let i = 0; i < count; i++) {
            this.fxParticles.push({
                x: Math.random() * this.width,
                y: -10 - Math.random() * 50,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 5 + 3,
                radius: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: Math.random() * 0.008 + 0.003,
                gravity: 0.05,
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.2,
                shape: 'confetti'
            });
        }
    }

    // Main animation loop
    animate() {
        // 1. Draw Ambient Background
        if (this.bgCtx) {
            this.bgCtx.clearRect(0, 0, this.width, this.height);
            this.bgCtx.fillStyle = '#ffffff';

            for (const p of this.bgParticles) {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = this.width;
                if (p.x > this.width) p.x = 0;
                if (p.y < 0) p.y = this.height;
                if (p.y > this.height) p.y = 0;

                this.bgCtx.globalAlpha = p.alpha;
                this.bgCtx.beginPath();
                this.bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.bgCtx.fill();
            }
        }

        // 2. Draw FX Particles
        if (this.fxCtx) {
            this.fxCtx.clearRect(0, 0, this.width, this.height);

            for (let i = this.fxParticles.length - 1; i >= 0; i--) {
                const p = this.fxParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.alpha -= p.decay;

                if (p.rotation !== undefined) {
                    p.rotation += p.vRot;
                }

                if (p.alpha <= 0) {
                    this.fxParticles.splice(i, 1);
                    continue;
                }

                this.fxCtx.save();
                this.fxCtx.globalAlpha = Math.max(0, p.alpha);
                this.fxCtx.fillStyle = p.color;

                if (p.shape === 'square') {
                    this.fxCtx.translate(p.x, p.y);
                    this.fxCtx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
                } else if (p.shape === 'confetti') {
                    this.fxCtx.translate(p.x, p.y);
                    this.fxCtx.rotate(p.rotation);
                    this.fxCtx.fillRect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
                } else {
                    this.fxCtx.beginPath();
                    this.fxCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    this.fxCtx.fill();
                }

                this.fxCtx.restore();
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.effectsManager = new EffectsManager();
});
