import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { useGameStore } from '../../store/useGameStore';
import { useConfigStore } from '../../store/useConfigStore';

export class MainGame extends Phaser.Scene {

    // ── Images ──────────────────────────────────────────────────────────────
    private coloredImage!: Phaser.GameObjects.Image;   // back layer – always visible
    private maskImage!:    Phaser.GameObjects.Image;   // front layer – line-art canvas (gets erased)

    // ── Off-screen erasing canvas ─────────────────────────────────────────
    private maskCanvas!:    HTMLCanvasElement;
    private maskCtx!:       CanvasRenderingContext2D;
    private maskTexKey!:    string;

    // ── Input state ───────────────────────────────────────────────────────
    private isDrawing:    boolean = false;
    private lastPt:       Phaser.Math.Vector2 | null = null;
    private brushSize:    number = 40;

    // ── Completion state ─────────────────────────────────────────────────
    private revealPercent: number = 0;
    private triggered95:   boolean = false;
    // Bounding box of the drawn line-art area (excludes white margins)
    private artBounds: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };
    // Throttle: only sample pixels every 300ms
    private lastProgressCheck: number = 0;

    constructor() {
        super('MainGame');
    }

    // ─────────────────────────────────────────────────────────────────────
    create() {
        // ── CRITICAL: Reset all per-session state ─────────────────────────
        // Phaser restarts scenes by calling create() on the SAME class instance.
        // The constructor is NEVER called again, so class-property defaults
        // (e.g. `triggered95 = false`) are NOT restored automatically.
        // Every field that affects painting or reveal must be explicitly reset here.
        this.triggered95       = false;
        this.revealPercent     = 0;
        this.lastProgressCheck = 0;
        this.isDrawing         = false;
        this.lastPt            = null;
        this.artBounds         = { x: 0, y: 0, w: 0, h: 0 };
        // ─────────────────────────────────────────────────────────────────

        EventBus.emit('current-scene-ready', this);

        const W = this.cameras.main.width;
        const H = this.cameras.main.height;

        // 1. Off-screen mask canvas (same dimensions as Phaser canvas)
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width  = W;
        this.maskCanvas.height = H;
        this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true })!;
        // Fill fully transparent initially — will be painted with line art after load
        this.maskCtx.clearRect(0, 0, W, H);

        this.maskTexKey = 'maskTex_' + Date.now();
        this.textures.addCanvas(this.maskTexKey, this.maskCanvas);

        // 2. Placeholder images (hidden until textures load)
        this.coloredImage = this.add.image(W / 2, H / 2, '__DEFAULT').setAlpha(0);
        this.maskImage    = this.add.image(W / 2, H / 2, this.maskTexKey);

        // 3. Read current set from store and load assets
        const set = useGameStore.getState().selectedSet;
        if (set && set.lineArtUrl && set.coloredArtUrl) {
            this.loadSet(set.lineArtUrl, set.coloredArtUrl);
        }

        // 4. Input
        this.setupInput();

        // 5. EventBus listeners
        this.setupUIListeners();

        // Cleanup on shutdown
        this.events.on('shutdown', () => {
            EventBus.off('ui-brush-size');
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    private loadSet(lineArtUrl: string, coloredArtUrl: string) {
        useGameStore.getState()._setAssetLoading(true);

        const ts       = Date.now();
        const lineKey  = 'lineart_'  + ts;
        const colorKey = 'colored_'  + ts;

        const proxyUrl = (url: string) =>
            url.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(url)}` : url;

        this.load.image(lineKey,  proxyUrl(lineArtUrl));
        this.load.image(colorKey, proxyUrl(coloredArtUrl));

        this.load.once('complete', () => {
            if (!this.scene) return;

            const W = this.cameras.main.width;
            const H = this.cameras.main.height;

            // Place colored image at back
            this.coloredImage.setTexture(colorKey);
            this.fitImage(this.coloredImage, W, H);
            this.coloredImage.setAlpha(1);

            // ── Compute display rect (% of canvas) → used by React to ──────
            // align the video element pixel-perfectly with this image.
            {
                const dw = this.coloredImage.displayWidth;
                const dh = this.coloredImage.displayHeight;
                const cx = this.coloredImage.x;
                const cy = this.coloredImage.y;
                useGameStore.getState().setImageDisplayRect({
                    xPct: (cx - dw / 2) / W,
                    yPct: (cy - dh / 2) / H,
                    wPct: dw / W,
                    hPct: dh / H,
                });
            }

            // Paint line art onto mask canvas (full opacity)
            this.paintLineArtToCanvas(lineKey, W, H);

            // Refresh texture so Phaser picks up the new canvas pixels
            (this.textures.get(this.maskTexKey) as Phaser.Textures.CanvasTexture).refresh();

            // Re-fit mask image
            this.maskImage.setScale(1); // mask canvas is full canvas size
            this.maskImage.setPosition(W / 2, H / 2);

            useGameStore.getState()._setAssetLoading(false);
        });

        this.load.once('loaderror', () => {
            console.error('Asset load failed');
            useGameStore.getState()._setAssetLoading(false);
        });

        this.load.start();
    }

    // Fit a Phaser image to fill 90% width or 85% height (whichever is smaller)
    private fitImage(img: Phaser.GameObjects.Image, W: number, H: number) {
        const tex   = img.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
        const imgW  = tex.width;
        const imgH  = tex.height;
        if (!imgW || !imgH) return;

        const scale = Math.min((W * 0.9) / imgW, (H * 0.85) / imgH);
        img.setScale(scale);
        img.setPosition(W / 2, H / 2);
    }

    // Draw line art image into the mask canvas at the same screen position/scale as coloredImage
    // Also records artBounds so progress tracking only samples the art region
    private paintLineArtToCanvas(lineKey: string, W: number, H: number) {
        const tex    = this.textures.get(lineKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
        const imgW   = tex.width;
        const imgH   = tex.height;
        if (!imgW || !imgH) return;

        const scale   = Math.min((W * 0.9) / imgW, (H * 0.85) / imgH);
        const drawW   = Math.floor(imgW * scale);
        const drawH   = Math.floor(imgH * scale);
        const drawX   = Math.floor((W - drawW) / 2);
        const drawY   = Math.floor((H - drawH) / 2);

        // Record the art bounding box for accurate progress sampling
        this.artBounds = { x: drawX, y: drawY, w: drawW, h: drawH };

        // White background so areas outside the line art are also opaque
        this.maskCtx.fillStyle = '#ffffff';
        this.maskCtx.fillRect(0, 0, W, H);

        // Draw line art on top
        this.maskCtx.drawImage(tex as CanvasImageSource, drawX, drawY, drawW, drawH);
    }

    // ─────────────────────────────────────────────────────────────────────
    private setupInput() {
        this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
            this.isDrawing = true;
            this.lastPt = new Phaser.Math.Vector2(ptr.x, ptr.y);
            this.eraseAt(ptr.x, ptr.y, ptr.x, ptr.y);
        });

        this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
            if (!this.isDrawing || !this.lastPt) return;
            this.eraseAt(this.lastPt.x, this.lastPt.y, ptr.x, ptr.y);
            this.lastPt.set(ptr.x, ptr.y);
            // Throttled live progress update during stroke
            const now = Date.now();
            if (now - this.lastProgressCheck > 300) {
                this.lastProgressCheck = now;
                this.checkRevealProgress();
            }
        });

        const endStroke = () => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.lastPt = null;
                this.checkRevealProgress(); // always check on lift
            }
        };
        this.input.on('pointerup',  endStroke);
        this.input.on('pointerout', endStroke);
    }

    private setupUIListeners() {
        // Use config default for initial brush size
        this.brushSize = useConfigStore.getState().config.brushDefault;
        EventBus.on('ui-brush-size', (size: number) => { this.brushSize = size; });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Core erase: soft radial gradient circles along the stroke path
    private eraseAt(fromX: number, fromY: number, toX: number, toY: number) {
        if (this.triggered95) return; // no more drawing once auto-reveal fires

        const r    = this.brushSize;
        const dist = Math.hypot(toX - fromX, toY - fromY);
        const steps = Math.max(1, Math.ceil(dist / (r * 0.4)));

        this.maskCtx.globalCompositeOperation = 'destination-out';

        for (let i = 0; i <= steps; i++) {
            const t  = i / steps;
            const cx = fromX + (toX - fromX) * t;
            const cy = fromY + (toY - fromY) * t;

            // Soft radial gradient for a beautiful "magic reveal" feel
            const grad = this.maskCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
            grad.addColorStop(0,   'rgba(0,0,0,1)');
            grad.addColorStop(0.6, 'rgba(0,0,0,0.85)');
            grad.addColorStop(1,   'rgba(0,0,0,0)');

            this.maskCtx.fillStyle = grad;
            this.maskCtx.beginPath();
            this.maskCtx.arc(cx, cy, r, 0, Math.PI * 2);
            this.maskCtx.fill();
        }

        // Restore composite for any future ops
        this.maskCtx.globalCompositeOperation = 'source-over';

        // Refresh Phaser texture
        (this.textures.get(this.maskTexKey) as Phaser.Textures.CanvasTexture).refresh();
    }

    // ─────────────────────────────────────────────────────────────────────
    // Sample transparency ONLY within the art bounding box for accurate %
    private checkRevealProgress() {
        const { x, y, w, h } = this.artBounds;
        if (!w || !h) return;

        // Sample the art region only — avoids white margins inflating the denominator
        const data = this.maskCtx.getImageData(x, y, w, h).data;
        let transparent = 0;
        const total = w * h;

        // Sample every 2nd pixel (step=8 in data array) — fast & accurate
        for (let i = 3; i < data.length; i += 8) {
            if (data[i] < 20) transparent += 2;
        }

        this.revealPercent = Math.min(1, transparent / total);
        EventBus.emit('reveal-progress', this.revealPercent);

        if (!this.triggered95 && this.revealPercent >= useConfigStore.getState().config.revealThreshold) {
            this.triggered95 = true;
            EventBus.emit('reveal-threshold'); // React: start audio, prime video, glitter, canvas fade

            const { lineArtFadeDuration } = useConfigStore.getState().config;
            if (lineArtFadeDuration > 0) {
                this.tweens.add({
                    targets:  this.maskImage,
                    alpha:    0,
                    duration: lineArtFadeDuration,
                    ease:     'Sine.easeInOut',
                    onComplete: () => EventBus.emit('reveal-complete'),
                });
            } else {
                this.maskImage.setAlpha(0);
                EventBus.emit('reveal-complete');
            }
        }
    }
}
