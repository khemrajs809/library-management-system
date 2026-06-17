import { Component, ElementRef, OnDestroy, ViewChild, AfterViewInit, NgZone, Input } from '@angular/core';

@Component({
  selector: 'app-particle-animation',
  standalone: true,
  template: '<canvas #particleCanvas></canvas>',
  styles: [`
    :host {
      display: block;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      height: 800px;
      z-index: 0;
      pointer-events: none;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class ParticleAnimationComponent implements AfterViewInit, OnDestroy {
  @Input() theme: 'default' | 'security' = 'default';

  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private particles: any[] = [];
  private animationId: number = 0;
  private resizeListener!: () => void;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    if (typeof window === 'undefined') return;
    
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    
    this.resizeListener = () => this.resize();
    window.addEventListener('resize', this.resizeListener);
    this.resize();

    const colors = this.theme === 'security'
        ? ['#ef4444', '#dc2626', '#b91c1c', '#f87171', '#7f1d1d'] // Pure red theme for light backgrounds
        : [
            '#1A237E', '#1A237E', '#283593',
            '#4285F4', '#EA4335', '#FBBC05',
            '#34A853', '#8E24AA'
        ];
    const numParticles = this.theme === 'security' ? 1500 : 1200;
    const fov = 350;
    const viewDistance = 600;

    class Particle {
        x = 0; y = 0; z = 0;
        color = ''; baseSize = 0;
        driftX = 0; driftY = 0; driftZ = 0;

        constructor() {
            this.init();
        }

        init() {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const r = 250 + Math.random() * 350; 

            this.x = r * Math.sin(phi) * Math.cos(theta);
            this.y = r * Math.sin(phi) * Math.sin(theta);
            this.z = r * Math.cos(phi);

            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.baseSize = 1.5 + Math.random() * 2;
            
            this.driftX = (Math.random() - 0.5) * 0.002;
            this.driftY = (Math.random() - 0.5) * 0.002;
            this.driftZ = (Math.random() - 0.5) * 0.002;
        }

        update(globalAngleY: number, globalAngleX: number) {
            let rotY = globalAngleY + this.driftY;
            let rotX = globalAngleX + this.driftX;

            let newX = this.x * Math.cos(rotY) - this.z * Math.sin(rotY);
            let newZ = this.z * Math.cos(rotY) + this.x * Math.sin(rotY);
            this.x = newX;
            this.z = newZ;

            let newY = this.y * Math.cos(rotX) - this.z * Math.sin(rotX);
            newZ = this.z * Math.cos(rotX) + this.y * Math.sin(rotX);
            this.y = newY;
            this.z = newZ;
        }

        draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
            let scale = fov / (fov + this.z + viewDistance);
            if (scale < 0) return; 

            let x2d = (this.x * scale) + width / 2;
            let y2d = (this.y * scale) + height / 2;

            let dx = this.x * 0.06 * scale;
            let dy = this.y * 0.06 * scale;

            let alpha = Math.min(1, Math.max(0.1, (scale - 0.2) * 1.5));
            
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(x2d, y2d);
            ctx.lineTo(x2d + dx, y2d + dy);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.baseSize * scale;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    for (let i = 0; i < numParticles; i++) {
        this.particles.push(new Particle());
    }

    this.ngZone.runOutsideAngular(() => {
        const animate = () => {
            this.ctx.clearRect(0, 0, this.width, this.height);

            const globalAngleY = this.theme === 'security' ? 0.005 : 0.003; 
            const globalAngleX = this.theme === 'security' ? 0.0025 : 0.0015;

            this.particles.sort((a, b) => b.z - a.z);

            this.particles.forEach(p => {
                p.update(globalAngleY, globalAngleX);
                p.draw(this.ctx, this.width, this.height);
            });

            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    });
  }

  private resize() {
    if (typeof window === 'undefined') return;
    const canvas = this.canvasRef.nativeElement;
    this.width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    this.height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.resizeListener);
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
  }
}
