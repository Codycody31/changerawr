// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Adapted for standalone React use: removed Chrome error-page hooks, loadTimeData,
// arcade mode, and CDN audio loading. Sprites loaded externally; GeneratedSoundFx
// used for all audio.

import {DEFAULT_DIMENSIONS, FPS, IS_HIDPI, IS_IOS, IS_MOBILE, IS_RTL} from './constants';
import type {Dimensions} from './dimensions';
import {DistanceMeter} from './distance_meter';
import type {BaseConfig, Config, ConfigProvider, GameModeConfig} from './game_config';
import {GameOverPanel} from './game_over_panel';
import type {GameStateProvider} from './game_state_provider';
import {GeneratedSoundFx} from './generated_sound_fx';
import type {GeneratedSoundFxProvider} from './generated_sound_fx';
import {Horizon} from './horizon';
import type {ImageSpriteProvider} from './image_sprite_provider';
import type {Obstacle} from './obstacle';
import type {SpriteDefinition, SpriteDefinitionByType, SpritePositions} from './offline_sprite_definitions';
import {CollisionBox, spriteDefinitionByType} from './offline_sprite_definitions';
import {Status as TrexStatus, Trex} from './trex';
import {assert, getTimeStamp} from './utils';

const defaultBaseConfig: BaseConfig = {
    audiocueProximityThreshold: 190,
    audiocueProximityThresholdMobileA11y: 250,
    bgCloudSpeed: 0.2,
    bottomPad: 10,
    canvasInViewOffset: -10,
    clearTime: 3000,
    cloudFrequency: 0.5,
    fadeDuration: 1,
    flashDuration: 1000,
    gameoverClearTime: 1200,
    initialJumpVelocity: 12,
    invertFadeDuration: 12000,
    maxBlinkCount: 3,
    maxClouds: 6,
    maxObstacleLength: 3,
    maxObstacleDuplication: 2,
    resourceTemplateId: '',
    speed: 6,
    speedDropCoefficient: 3,
    arcadeModeInitialTopPosition: 35,
    arcadeModeTopPositionPercent: 0.1,
};

const normalModeConfig: GameModeConfig = {
    acceleration: 0.0015,
    audiocueProximityThreshold: 190,
    audiocueProximityThresholdMobileA11y: 250,
    gapCoefficient: 0.6,
    invertDistance: 700,
    maxSpeed: 17,
    mobileSpeedCoefficient: 1.2,
    speed: 8,
};

const slowModeConfig: GameModeConfig = {
    acceleration: 0.0005,
    audiocueProximityThreshold: 170,
    audiocueProximityThresholdMobileA11y: 220,
    gapCoefficient: 0.3,
    invertDistance: 350,
    maxSpeed: 9,
    mobileSpeedCoefficient: 1.5,
    speed: 4.2,
};

export type TrexDebugConfigSetting = 'gravity'|'minJumpHeight'|'speedDropCoefficient'|
    'initialJumpVelocity'|'speed';

enum RunnerClasses {
    CANVAS = 'runner-canvas',
    CONTAINER = 'runner-container',
    CRASHED = 'crashed',
    INVERTED = 'inverted',
    SNACKBAR = 'snackbar',
    SNACKBAR_SHOW = 'snackbar-show',
    TOUCH_CONTROLLER = 'controller',
}

const runnerKeycodes: {jump: number[], duck: number[], restart: number[]} = {
    jump: [38, 32],  // Up, spacebar
    duck: [40],      // Down
    restart: [13],   // Enter
};

enum RunnerEvents {
    ANIM_END = 'webkitAnimationEnd',
    CLICK = 'click',
    KEYDOWN = 'keydown',
    KEYUP = 'keyup',
    POINTERDOWN = 'pointerdown',
    POINTERUP = 'pointerup',
    RESIZE = 'resize',
    TOUCHEND = 'touchend',
    TOUCHSTART = 'touchstart',
    VISIBILITY = 'visibilitychange',
    BLUR = 'blur',
    FOCUS = 'focus',
    LOAD = 'load',
    GAMEPADCONNECTED = 'gamepadconnected',
}

let runnerInstance: Runner|null = null;
let ambientInstance: Runner|null = null;

export const AMBIENT_UNLOCK_KEY = 'dino-ambient-unlocked';
export const AMBIENT_ENABLED_KEY = 'dino-ambient-enabled';

export class Runner implements ImageSpriteProvider, GameStateProvider,
    ConfigProvider, GeneratedSoundFxProvider {
    private outerContainerEl: HTMLElement;
    private containerEl: HTMLElement|null = null;
    private touchController: HTMLElement|null = null;
    private canvas: HTMLCanvasElement|null = null;
    private canvasCtx: CanvasRenderingContext2D|null = null;
    private a11yStatusEl: HTMLElement|null = null;
    private slowSpeedCheckboxLabel: HTMLElement|null = null;
    private slowSpeedCheckbox: HTMLInputElement|null = null;
    private slowSpeedToggleEl: HTMLElement|null = null;
    private imageSprite: HTMLImageElement;
    private origImageSprite: HTMLImageElement;

    private config: Config;
    private dimensions: Dimensions = DEFAULT_DIMENSIONS;
    private spriteDefinition: SpriteDefinition = spriteDefinitionByType.original;
    private spriteDef: SpritePositions|null = null;

    private tRex: Trex|null = null;
    private distanceMeter: DistanceMeter|null = null;
    private gameOverPanel: GameOverPanel|null = null;
    private horizon: Horizon|null = null;

    private msPerFrame: number = 1000 / FPS;
    private time: number = 0;
    private distanceRan: number = 0;
    private runningTime: number = 0;
    private currentSpeed: number;
    private resizeTimerId?: ReturnType<typeof setInterval>;
    private raqId: number = 0;
    private playCount: number = 0;

    private activated: boolean = false;
    private playing: boolean = false;
    private playingIntro: boolean = false;
    private crashed: boolean = false;
    private paused: boolean = false;
    private inverted: boolean = false;
    private isDarkMode: boolean = false;
    private updatePending: boolean = false;
    private hasSlowdownInternal: boolean = false;
    private hasAudioCuesInternal: boolean = false;

    private highestScore: number = 0;

    private invertTimer: number = 0;
    private invertTrigger: boolean = false;

    private isAmbient: boolean = false;

    private generatedSoundFx: GeneratedSoundFx|null = null;

    private pollingGamepads: boolean = false;
    private gamepadIndex?: number;
    private previousGamepad: Gamepad|null = null;

    // ── Public hooks ─────────────────────────────────────────────────────────
    onInvertChange?: (inverted: boolean) => void;

    // ── Debug (dev-only) ─────────────────────────────────────────────────────
    debugCollision: boolean = false;
    private fpsFrames: number = 0;
    private fpsLast: number = 0;
    private fpsValue: number = 0;

    /** Force/clear night-mode inversion. */
    debugToggleNight() {
        this.invertTrigger = !this.invertTrigger;
        // Reset timer so the game loop doesn't immediately undo the toggle.
        this.invertTimer = this.invertTrigger ? 1 : 0;
        this.invert(false);
    }

    /** Returns the rolling FPS (updated once per second). */
    getDebugFps(): number { return this.fpsValue; }

    /** Returns current tRex jump/physics config values for the debug panel. */
    getTrexDebugValues(): { gravity: number; minJumpHeight: number; initialJumpVelocity: number; speedDropCoefficient: number } | null {
        if (!this.tRex) return null;
        return {
            gravity: this.tRex.config.gravity,
            minJumpHeight: this.tRex.config.minJumpHeight,
            initialJumpVelocity: this.tRex.config.initialJumpVelocity,
            speedDropCoefficient: this.tRex.config.speedDropCoefficient,
        };
    }

    /** Returns the live game speed. */
    getCurrentSpeed(): number { return this.currentSpeed; }

    /** Returns whether the game is currently paused. */
    isGamePaused(): boolean { return this.paused; }

    /** Returns whether the game is in crashed state. */
    isCrashed(): boolean { return this.crashed; }

    /** Returns the stored high score (display units). */
    getHighestScore(): number { return this.highestScore; }

    /**
     * Update the invert-trigger distance and immediately reset the current
     * night cycle so the new value takes effect right away.
     */
    setInvertDistance(v: number) {
        this.config.invertDistance = v;
        this.invertTimer = 0;
        this.invertTrigger = false;
        this.invert(true); // snap back to day
    }

    /** Fired when a non-ambient game ends. Receives the final display score. */
    onGameOver?: (score: number) => void;

    /** Toggle pause/resume (no-op when crashed or not yet playing). */
    debugTogglePause() {
        if (this.crashed || (!this.playing && !this.paused)) return;
        if (this.paused) {
            assert(this.tRex);
            this.tRex.reset();
            this.play();
        } else {
            this.stop();
        }
    }

    static initializeInstance(
        outerContainerEl: HTMLElement, imageSprite: HTMLImageElement,
        config?: Config): Runner {
        if (runnerInstance) {
            runnerInstance.destroy();
        }
        runnerInstance = new Runner(outerContainerEl, imageSprite, config);
        return runnerInstance;
    }

    static getInstance(): Runner|null {
        return runnerInstance;
    }

    static destroyInstance() {
        if (runnerInstance) {
            runnerInstance.destroy();
            runnerInstance = null;
        }
    }

    static initializeAmbientInstance(
        outerContainerEl: HTMLElement, imageSprite: HTMLImageElement): Runner {
        if (ambientInstance) ambientInstance.destroy();
        ambientInstance = new Runner(outerContainerEl, imageSprite, undefined, true);
        return ambientInstance;
    }

    static destroyAmbientInstance() {
        if (ambientInstance) { ambientInstance.destroy(); ambientInstance = null; }
    }

    static isAmbientUnlocked(): boolean {
        try { return localStorage.getItem(AMBIENT_UNLOCK_KEY) === '1'; } catch { return false; }
    }

    static unlockAmbient() {
        try { localStorage.setItem(AMBIENT_UNLOCK_KEY, '1'); } catch {}
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dino-ambient-unlocked'));
        }
    }

    /** Activate the game loop without triggering a jump. Player presses SPACE to start jumping. */
    startImmediately() {
        if (!this.tRex || this.playing || this.crashed) return;
        this.initSounds();
        this.activated = true;
        this.setPlayStatus(true);
        this.time = getTimeStamp();
        // In Status.WAITING the tRex only draws during blink cycles (every 7 s).
        // Transition to RUNNING so it draws on every frame without requiring a jump.
        this.tRex.update(0, TrexStatus.RUNNING);
        this.ambientFixTrexPos();
        // Cancel any pending blink-loop RAF and kick the game loop directly.
        if (this.raqId) {
            cancelAnimationFrame(this.raqId);
            this.raqId = 0;
        }
        this.updatePending = false;
        this.update();
    }

    /**
     * In ambient mode the intro animation is skipped so xPos stays at 0.
     * Force it to startXPos (50) so collision/AI calculations are correct.
     */
    private ambientFixTrexPos() {
        if (this.isAmbient && this.tRex && this.tRex.xPos < this.tRex.config.startXPos) {
            this.tRex.xPos = this.tRex.config.startXPos;
        }
    }

    private constructor(
        outerContainerEl: HTMLElement, imageSprite: HTMLImageElement,
        configParam?: Config, isAmbient: boolean = false) {
        this.outerContainerEl = outerContainerEl;
        this.imageSprite = imageSprite;
        this.origImageSprite = imageSprite;
        this.isAmbient = isAmbient;
        this.config = configParam || Object.assign({}, defaultBaseConfig, normalModeConfig);
        if (isAmbient) {
            this.config.cloudFrequency = 0;
            this.config.maxClouds = 0;
            this.config.invertDistance = 9_999_999; // suppress auto night-mode
        }
        this.currentSpeed = this.config.speed;

        if (IS_HIDPI) {
            this.spriteDef = this.getSpriteDefinition().hdpi;
        } else {
            this.spriteDef = this.getSpriteDefinition().ldpi;
        }

        if (imageSprite.complete) {
            this.init();
        } else {
            imageSprite.addEventListener(RunnerEvents.LOAD, this.init.bind(this));
        }
    }

    get hasSlowdown(): boolean {
        return this.hasSlowdownInternal;
    }

    get hasAudioCues(): boolean {
        return this.hasAudioCuesInternal;
    }

    isAltGameModeEnabled(): boolean {
        return false;
    }

    getGeneratedSoundFx(): GeneratedSoundFx|null {
        return this.generatedSoundFx;
    }

    getSpriteDefinition(): SpriteDefinition {
        return this.spriteDefinition;
    }

    getOrigImageSprite(): HTMLImageElement {
        return this.origImageSprite;
    }

    getRunnerImageSprite(): HTMLImageElement {
        return this.imageSprite;
    }

    getRunnerAltGameImageSprite(): HTMLImageElement|null {
        return null;
    }

    getAltCommonImageSprite(): HTMLImageElement|null {
        return null;
    }

    getConfig(): Config {
        return this.config;
    }

    updateConfigSetting<K extends keyof Config>(setting: K, value: Config[K]) {
        this.config[setting] = value;
    }

    updateTrexConfigSetting(setting: TrexDebugConfigSetting, value: number) {
        assert(this.tRex);

        switch (setting) {
            case 'gravity':
            case 'minJumpHeight':
            case 'speedDropCoefficient':
                this.tRex.config[setting] = value;
                break;
            case 'initialJumpVelocity':
                this.tRex.setJumpVelocity(value);
                break;
            case 'speed':
                this.setSpeed(value);
                break;
            default:
                break;
        }
    }

    private setSpeed(newSpeed?: number) {
        const speed = newSpeed || this.currentSpeed;

        if (this.dimensions.width < DEFAULT_DIMENSIONS.width) {
            const mobileSpeed = this.hasSlowdown ? speed :
                speed * this.dimensions.width /
                DEFAULT_DIMENSIONS.width * this.config.mobileSpeedCoefficient;
            this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
        } else if (newSpeed) {
            this.currentSpeed = newSpeed;
        }
    }

    private init() {
        assert(this.spriteDef);

        // Wipe any leftover DOM from a previous instance (guards against double-init).
        this.outerContainerEl.innerHTML = '';

        this.adjustDimensions();
        this.setSpeed();

        this.containerEl = document.createElement('div');
        this.containerEl.setAttribute('role', IS_MOBILE ? 'button' : 'application');
        this.containerEl.setAttribute('tabindex', this.isAmbient ? '-1' : '0');
        this.containerEl.setAttribute('title', '');
        this.containerEl.setAttribute('aria-label', '');
        this.containerEl.className = RunnerClasses.CONTAINER;
        this.containerEl.style.outline = 'none';

        this.canvas = createCanvas(
            this.containerEl, this.dimensions.width, this.dimensions.height);

        this.a11yStatusEl = document.createElement('span');
        this.a11yStatusEl.className = 'offline-runner-live-region';
        this.a11yStatusEl.setAttribute('aria-live', 'assertive');
        this.a11yStatusEl.textContent = '';

        this.slowSpeedCheckboxLabel = document.createElement('label');
        this.slowSpeedCheckboxLabel.className = 'slow-speed-option hidden';

        this.slowSpeedCheckbox = document.createElement('input');
        this.slowSpeedCheckbox.setAttribute('type', 'checkbox');
        this.slowSpeedCheckbox.setAttribute('tabindex', '0');
        this.slowSpeedCheckbox.setAttribute('checked', 'checked');

        this.slowSpeedToggleEl = document.createElement('span');
        this.slowSpeedToggleEl.className = 'slow-speed-toggle';

        this.slowSpeedCheckboxLabel.appendChild(this.slowSpeedCheckbox);
        this.slowSpeedCheckboxLabel.appendChild(this.slowSpeedToggleEl);

        if (IS_IOS) {
            this.outerContainerEl.appendChild(this.a11yStatusEl);
        } else {
            this.containerEl.appendChild(this.a11yStatusEl);
        }

        const canvasContext = this.canvas.getContext('2d');
        assert(canvasContext);
        this.canvasCtx = canvasContext;
        this.canvasCtx.fillStyle = '#f7f7f7';
        this.canvasCtx.fill();
        updateCanvasScaling(this.canvas);

        this.horizon = new Horizon(
            this.canvas, this.spriteDef, this.dimensions,
            this.config.gapCoefficient, this);

        if (this.isAmbient) this.horizon.clearClouds();

        this.distanceMeter = new DistanceMeter(
            this.canvas, this.spriteDef.textSprite, this.dimensions.width, this);

        this.tRex = new Trex(this.canvas, this.spriteDef.tRex, this);

        this.outerContainerEl.appendChild(this.containerEl);
        // Keep checkbox in DOM for a11y toggle logic but hide it visually.
        this.slowSpeedCheckboxLabel.style.display = 'none';
        this.outerContainerEl.appendChild(this.slowSpeedCheckboxLabel);

        if (!this.isAmbient) {
            const storedDisplay = Runner.loadHighScore();
            if (storedDisplay > 0) {
                this.highestScore = storedDisplay;
                this.distanceMeter.setHighScoreDisplay(storedDisplay);
            }
        }

        this.startListening();
        this.update();

        window.addEventListener(RunnerEvents.RESIZE, this.debounceResize.bind(this));

        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.isDarkMode = darkModeMediaQuery && darkModeMediaQuery.matches;
        darkModeMediaQuery.addListener((e) => {
            this.isDarkMode = e.matches;
        });
    }

    private initSounds() {
        if (this.isAmbient) return;
        if (!this.generatedSoundFx) {
            this.generatedSoundFx = new GeneratedSoundFx();
        }
    }

    private createTouchController() {
        this.touchController = document.createElement('div');
        this.touchController.className = RunnerClasses.TOUCH_CONTROLLER;
        this.touchController.addEventListener(RunnerEvents.TOUCHSTART, this);
        this.touchController.addEventListener(RunnerEvents.TOUCHEND, this);
        this.outerContainerEl.appendChild(this.touchController);
    }

    private debounceResize() {
        if (this.resizeTimerId === undefined) {
            this.resizeTimerId = setInterval(this.adjustDimensions.bind(this), 250);
        }
    }

    private adjustDimensions() {
        clearInterval(this.resizeTimerId);
        this.resizeTimerId = undefined;

        const boxStyles = window.getComputedStyle(this.outerContainerEl);
        const padding = Number(
            boxStyles.paddingLeft.substr(0, boxStyles.paddingLeft.length - 2));

        this.dimensions.width = this.outerContainerEl.offsetWidth - padding * 2;
        // In ambient mode the container spans the full viewport via CSS; if layout
        // hasn't run yet offsetWidth can return 0, which would spawn all obstacles
        // at x=0 right on the dino.
        if (this.isAmbient && this.dimensions.width <= 0) {
            this.dimensions.width = window.innerWidth || DEFAULT_DIMENSIONS.width;
        }

        if (this.canvas) {
            assert(this.distanceMeter);
            assert(this.horizon);
            assert(this.tRex);
            assert(this.containerEl);
            this.canvas.width = this.dimensions.width;
            this.canvas.height = this.dimensions.height;

            updateCanvasScaling(this.canvas);

            this.distanceMeter.calcXpos(this.dimensions.width);
            this.clearCanvas();
            this.horizon.update(0, 0, true, false);
            this.tRex.update(0);

            if (this.playing || this.crashed || this.paused) {
                this.containerEl.style.width = this.dimensions.width + 'px';
                this.containerEl.style.height = this.dimensions.height + 'px';
                if (!this.isAmbient) {
                    this.distanceMeter.update(0, Math.ceil(this.distanceRan));
                }
                this.stop();
                if (this.isAmbient && !this.crashed) {
                    // No keyboard to resume in ambient mode — restart immediately.
                    this.tRex?.reset();
                    this.play();
                }
            } else {
                this.tRex.draw(0, 0);
            }

            if (this.crashed && this.gameOverPanel) {
                this.gameOverPanel.updateDimensions(this.dimensions.width);
                this.gameOverPanel.draw(false, this.tRex);
            }
        }
    }

    private playIntro() {
        if (!this.activated && !this.crashed) {
            assert(this.tRex);
            assert(this.containerEl);
            this.playingIntro = true;
            this.tRex.playingIntro = true;

            const keyframes = '@-webkit-keyframes intro { ' +
                'from { width:' + this.tRex.config.width + 'px }' +
                'to { width: ' + this.dimensions.width + 'px }' +
                '}';
            const styleSheet = document.styleSheets[0];
            assert(styleSheet);
            styleSheet.insertRule(keyframes, 0);

            this.containerEl.addEventListener(
                RunnerEvents.ANIM_END, this.startGame.bind(this));

            this.containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both';
            this.containerEl.style.width = this.dimensions.width + 'px';

            this.setPlayStatus(true);
            this.activated = true;
        } else if (this.crashed) {
            this.restart();
        }
    }

    private startGame() {
        assert(this.containerEl);
        assert(this.tRex);
        this.toggleSpeed();
        this.runningTime = 0;
        this.playingIntro = false;
        this.tRex.playingIntro = false;
        this.containerEl.style.webkitAnimation = '';
        this.playCount++;

        if (this.hasAudioCuesInternal) {
            this.generatedSoundFx?.background();
            this.containerEl.setAttribute('title', '');
        }

        document.addEventListener(RunnerEvents.VISIBILITY, this.onVisibilityChange.bind(this));
        window.addEventListener(RunnerEvents.BLUR, this.onVisibilityChange.bind(this));
        window.addEventListener(RunnerEvents.FOCUS, this.onVisibilityChange.bind(this));
    }

    private clearCanvas() {
        assert(this.canvasCtx);
        this.canvasCtx.clearRect(0, 0, this.dimensions.width, this.dimensions.height);
    }

    private isCanvasInView(): boolean {
        assert(this.containerEl);
        return this.containerEl.getBoundingClientRect().top >
            this.config.canvasInViewOffset;
    }

    private update() {
        assert(this.tRex);

        this.updatePending = false;

        const now = getTimeStamp();
        let deltaTime = now - (this.time || now);

        this.time = now;

        if (this.playing) {
            assert(this.distanceMeter);
            assert(this.horizon);
            assert(this.canvasCtx);

            // FPS tracking (rolling 1-second window).
            this.fpsFrames++;
            if (now - this.fpsLast >= 1000) {
                this.fpsValue  = this.fpsFrames;
                this.fpsFrames = 0;
                this.fpsLast   = now;
            }

            this.clearCanvas();

            this.canvasCtx.globalAlpha = 1;

            if (this.tRex.jumping) {
                this.tRex.updateJump(deltaTime);
            }

            this.runningTime += deltaTime;
            const hasObstacles = this.runningTime > this.config.clearTime;

            if (this.tRex.jumpCount === 1 && !this.playingIntro) {
                this.playIntro();
            }

            if (this.playingIntro) {
                this.horizon.update(0, this.currentSpeed, hasObstacles, false);
            } else if (!this.crashed) {
                const showNightMode = this.inverted;
                deltaTime = !this.activated ? 0 : deltaTime;
                this.horizon.update(deltaTime, this.currentSpeed, hasObstacles, showNightMode);
            }

            const firstObstacle = this.horizon.obstacles[0];

            // ── Ambient AI ────────────────────────────────────────────────────
            if (this.isAmbient && !this.crashed) {
                this.ambientFixTrexPos();

                const dino  = this.tRex;
                const speed = this.currentSpeed;

                const dinoHitRight = dino.xPos + 40; // head box right edge (xPos+1+22+17)
                const dinoRight    = dino.xPos + dino.config.width; // visual right

                // Use fixed ground-position thresholds — NOT dino.yPos, which
                // changes mid-jump and would misclassify obstacles while airborne.
                // groundY = canvas height − dino height − bottomPad = 150−47−10 = 93.
                const groundY  = DEFAULT_DIMENSIONS.height - dino.config.height - this.config.bottomPad;
                const runTopY  = groundY + 1;   // 94  — running head top hit edge
                const duckTopY = groundY + 19;  // 112 — ducking hitbox top edge

                // Leftmost hit-x of an obstacle from its actual collision boxes.
                const hitLeft = (o: Obstacle) => {
                    let left = o.xPos + o.typeConfig.width * o.size;
                    for (const b of o.collisionBoxes) {
                        left = Math.min(left, o.xPos + 1 + b.x);
                    }
                    return left;
                };

                // First obstacle whose right edge is still ahead of the dino.
                let oi = 0;
                while (oi < this.horizon.obstacles.length) {
                    const o = this.horizon.obstacles[oi]!;
                    if (o.xPos + o.typeConfig.width * o.size > dino.xPos) break;
                    oi++;
                }
                const obs = this.horizon.obstacles[oi];

                if (obs) {
                    const obsLeft  = hitLeft(obs);
                    const obsRight = obs.xPos + obs.typeConfig.width * obs.size;
                    const gap      = obsLeft - dinoHitRight; // +ve = not yet touching

                    // ── Classify by obstacle type / height ────────────────────
                    // Pterodactyls fly at three known heights — check yPos directly.
                    //   yPos ≤ 50  high-flying : run straight under, no action
                    //   yPos ≤ 75  mid-height  : duck under
                    //   yPos > 75  low-flying  : jump over
                    // Everything else (cacti) sits on the ground → must jump.
                    const isPtero = obs.typeConfig.type === 'pterodactyl';
                    const canRunUnder  = isPtero && obs.yPos <= 50;
                    const canDuckUnder = isPtero && obs.yPos > 50 && obs.yPos <= 75;
                    const mustJump     = !canRunUnder && !canDuckUnder;

                    // Separate trigger distances: jump needs less lead time (physics
                    // carries the dino up); duck should start a bit earlier so the
                    // hitbox has changed well before the ptero arrives.
                    const jumpDist = speed * 8;   // obstacle arrives ~8 frames after takeoff
                    const duckDist = speed * 12;  // start ducking with a comfortable buffer

                    // ── Act ───────────────────────────────────────────────────
                    if (mustJump) {
                        // Standing up from a duck is immediate; do it regardless
                        // of gap so we're always ready to jump.
                        if (dino.ducking) { dino.speedDrop = false; dino.setDuck(false); }
                        if (!dino.jumping && gap >= 0 && gap <= jumpDist) {
                            dino.startJump(speed);
                            // Pre-advance 2 frames so same-tick collision check
                            // sees the dino already rising off the ground.
                            dino.updateJump(deltaTime);
                            dino.updateJump(deltaTime);
                        }
                    } else if (canDuckUnder) {
                        if (!dino.jumping) {
                            if (gap >= 0 && gap <= duckDist) {
                                // Ptero entering the reaction window — duck.
                                dino.setDuck(true);
                            } else if (gap > duckDist && dino.ducking) {
                                // Ptero still far away (we were ducked from a
                                // previous obstacle) — stand up and wait.
                                dino.speedDrop = false;
                                dino.setDuck(false);
                            }
                            // gap < 0: ptero is directly overhead or just past —
                            // keep duck until the loop's skip threshold (xPos ≤ 4)
                            // naturally transitions obs to the next obstacle.
                        }
                    } else {
                        // canRunUnder, or obs just became a different type —
                        // release any lingering duck immediately.
                        if (dino.ducking) { dino.speedDrop = false; dino.setDuck(false); }
                    }
                } else {
                    // No obstacles ahead.
                    if (dino.ducking) { dino.speedDrop = false; dino.setDuck(false); }
                }
            }

            let collision = hasObstacles && firstObstacle &&
                this.checkForCollision(
                    firstObstacle, this.tRex,
                    this.debugCollision ? this.canvasCtx ?? undefined : undefined,
                    this.isAmbient ? 3 : 0);

            if (this.hasAudioCuesInternal && hasObstacles) {
                assert(firstObstacle);
                const jumpObstacle = firstObstacle.typeConfig.type !== 'collectable';

                if (!firstObstacle.jumpAlerted) {
                    const threshold = this.config.audiocueProximityThreshold;
                    const adjProximityThreshold = threshold +
                        (threshold * Math.log10(this.currentSpeed / this.config.speed));

                    if (firstObstacle.xPos < adjProximityThreshold) {
                        if (jumpObstacle) {
                            this.generatedSoundFx?.jump();
                        }
                        firstObstacle.jumpAlerted = true;
                    }
                }
            }

            if (!collision) {
                this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;

                if (this.currentSpeed < this.config.maxSpeed) {
                    this.currentSpeed += this.config.acceleration;
                }
            } else {
                this.gameOver();
            }

            const playAchievementSound = !this.isAmbient &&
                this.distanceMeter.update(deltaTime, Math.ceil(this.distanceRan));

            if (!this.hasAudioCuesInternal && playAchievementSound && !this.crashed) {
                this.generatedSoundFx?.score();
            }

            if (this.invertTimer > this.config.invertFadeDuration) {
                this.invertTimer = 0;
                this.invertTrigger = false;
                this.invert(false);
            } else if (this.invertTimer) {
                this.invertTimer += deltaTime;
            } else {
                const actualDistance =
                    this.distanceMeter.getActualDistance(Math.ceil(this.distanceRan));

                if (actualDistance > 0) {
                    this.invertTrigger = !(actualDistance % this.config.invertDistance);

                    if (this.invertTrigger && this.invertTimer === 0) {
                        this.invertTimer += deltaTime;
                        this.invert(false);
                    }
                }
            }
        }

        if (this.playing ||
            (!this.activated && this.tRex.blinkCount < this.config.maxBlinkCount)) {
            this.tRex.update(deltaTime);
            this.scheduleNextUpdate();
        }
    }

    handleEvent(e: Event) {
        switch (e.type) {
            case RunnerEvents.KEYDOWN:
            case RunnerEvents.TOUCHSTART:
            case RunnerEvents.POINTERDOWN:
                this.onKeyDown(e);
                break;
            case RunnerEvents.KEYUP:
            case RunnerEvents.TOUCHEND:
            case RunnerEvents.POINTERUP:
                this.onKeyUp(e);
                break;
            case RunnerEvents.GAMEPADCONNECTED:
                this.onGamepadConnected();
                break;
            default:
        }
    }

    private handleCanvasKeyPress(e: Event) {
        if (!this.activated && !this.hasAudioCuesInternal) {
            this.toggleSpeed();
            this.hasAudioCuesInternal = true;
            if (!this.generatedSoundFx) {
                this.generatedSoundFx = new GeneratedSoundFx();
            }
            this.config.clearTime *= 1.2;
        } else if (
            e instanceof KeyboardEvent && runnerKeycodes.jump.includes(e.keyCode)) {
            this.onKeyDown(e);
        }
    }

    private preventScrolling(e: KeyboardEvent) {
        if (e.keyCode === 32) {
            e.preventDefault();
        }
    }

    private toggleSpeed() {
        if (this.hasAudioCuesInternal) {
            assert(this.slowSpeedCheckbox);
            const speedChange = this.hasSlowdown !== this.slowSpeedCheckbox.checked;

            if (speedChange) {
                assert(this.horizon);
                assert(this.tRex);
                this.hasSlowdownInternal = this.slowSpeedCheckbox.checked;
                const updatedConfig =
                    this.hasSlowdown ? slowModeConfig : normalModeConfig;

                this.config = Object.assign(defaultBaseConfig, updatedConfig);
                this.currentSpeed = updatedConfig.speed;
                this.tRex.enableSlowConfig();
                this.horizon.adjustObstacleSpeed();
            }
            if (this.playing) {
                this.disableSpeedToggle(true);
            }
        }
    }

    private showSpeedToggle(e?: Event) {
        const isFocusEvent = e && e.type === 'focus';
        if (this.hasAudioCuesInternal || isFocusEvent) {
            assert(this.slowSpeedCheckboxLabel);
            this.slowSpeedCheckboxLabel.classList.toggle(
                'hidden', isFocusEvent ? false : !this.crashed);
        }
    }

    private disableSpeedToggle(disable: boolean) {
        assert(this.slowSpeedCheckbox);
        if (disable) {
            this.slowSpeedCheckbox.setAttribute('disabled', 'disabled');
        } else {
            this.slowSpeedCheckbox.removeAttribute('disabled');
        }
    }

    private startListening() {
        if (this.isAmbient) return;
        assert(this.containerEl);
        assert(this.canvas);
        this.containerEl.addEventListener(
            RunnerEvents.KEYDOWN, this.handleCanvasKeyPress.bind(this));
        if (!IS_MOBILE) {
            this.containerEl.addEventListener(
                RunnerEvents.FOCUS, this.showSpeedToggle.bind(this));
        }
        this.canvas.addEventListener(
            RunnerEvents.KEYDOWN, this.preventScrolling.bind(this));
        this.canvas.addEventListener(
            RunnerEvents.KEYUP, this.preventScrolling.bind(this));

        document.addEventListener(RunnerEvents.KEYDOWN, this);
        document.addEventListener(RunnerEvents.KEYUP, this);

        this.containerEl.addEventListener(RunnerEvents.TOUCHSTART, this);
        document.addEventListener(RunnerEvents.POINTERDOWN, this);
        document.addEventListener(RunnerEvents.POINTERUP, this);

        window.addEventListener(RunnerEvents.GAMEPADCONNECTED, this);
    }

    private stopListening() {
        if (this.isAmbient) return;
        document.removeEventListener(RunnerEvents.KEYDOWN, this);
        document.removeEventListener(RunnerEvents.KEYUP, this);
        document.removeEventListener(RunnerEvents.POINTERDOWN, this);
        document.removeEventListener(RunnerEvents.POINTERUP, this);
        window.removeEventListener(RunnerEvents.GAMEPADCONNECTED, this);
        window.removeEventListener(RunnerEvents.RESIZE, this.debounceResize.bind(this));
        document.removeEventListener(RunnerEvents.VISIBILITY, this.onVisibilityChange.bind(this));
        window.removeEventListener(RunnerEvents.BLUR, this.onVisibilityChange.bind(this));
        window.removeEventListener(RunnerEvents.FOCUS, this.onVisibilityChange.bind(this));
    }

    private onKeyDown(e: Event) {
        if (IS_MOBILE && this.playing) {
            e.preventDefault();
        }

        if (this.isCanvasInView()) {
            if (e instanceof KeyboardEvent &&
                runnerKeycodes.jump.includes(e.keyCode) &&
                e.target === this.slowSpeedCheckbox) {
                return;
            }

            if (!this.crashed && !this.paused) {
                const isMobileMouseInput = IS_MOBILE && e instanceof PointerEvent &&
                    e.type === RunnerEvents.POINTERDOWN && e.pointerType === 'mouse' &&
                    (e.target === this.containerEl ||
                        (IS_IOS &&
                            (e.target === this.touchController || e.target === this.canvas)));
                assert(this.tRex);

                if ((e instanceof KeyboardEvent &&
                        runnerKeycodes.jump.includes(e.keyCode)) ||
                    e.type === RunnerEvents.TOUCHSTART || isMobileMouseInput) {
                    e.preventDefault();
                    if (!this.playing) {
                        if (!this.touchController && e.type === RunnerEvents.TOUCHSTART) {
                            this.createTouchController();
                        }
                        if (isMobileMouseInput) {
                            this.handleCanvasKeyPress(e);
                        }
                        this.initSounds();
                        this.setPlayStatus(true);
                        this.update();
                    }
                    if (!this.tRex.jumping && !this.tRex.ducking) {
                        if (this.hasAudioCuesInternal) {
                            this.generatedSoundFx?.cancelFootSteps();
                        } else {
                            this.generatedSoundFx?.jump();
                        }
                        this.tRex.startJump(this.currentSpeed);
                    }
                } else if (
                    this.playing && e instanceof KeyboardEvent &&
                    runnerKeycodes.duck.includes(e.keyCode)) {
                    e.preventDefault();
                    if (this.tRex.jumping) {
                        this.tRex.setSpeedDrop();
                    } else if (!this.tRex.jumping && !this.tRex.ducking) {
                        this.tRex.setDuck(true);
                    }
                }
            }
        }
    }

    private onKeyUp(e: Event) {
        assert(this.tRex);
        const keyCode = ('keyCode' in e) ? e.keyCode as number : 0;
        const isjumpKey = runnerKeycodes.jump.includes(keyCode) ||
            e.type === RunnerEvents.TOUCHEND || e.type === RunnerEvents.POINTERUP;

        if (this.isRunning() && isjumpKey) {
            this.tRex.endJump();
        } else if (runnerKeycodes.duck.includes(keyCode)) {
            this.tRex.speedDrop = false;
            this.tRex.setDuck(false);
        } else if (this.crashed) {
            const deltaTime = getTimeStamp() - this.time;

            if (this.isCanvasInView() &&
                (runnerKeycodes.restart.includes(keyCode) ||
                    this.isLeftClickOnCanvas(e) ||
                    (deltaTime >= this.config.gameoverClearTime &&
                        runnerKeycodes.jump.includes(keyCode)))) {
                this.handleGameOverClicks(e);
            }
        } else if (this.paused && isjumpKey) {
            this.tRex.reset();
            this.play();
        }
    }

    private onGamepadConnected() {
        if (!this.pollingGamepads) {
            this.pollGamepadState();
        }
    }

    private pollGamepadState() {
        const gamepads: Array<Gamepad|null> = navigator.getGamepads();
        this.pollActiveGamepad(gamepads);

        this.pollingGamepads = true;
        requestAnimationFrame(this.pollGamepadState.bind(this));
    }

    private pollForActiveGamepad(gamepads: Array<Gamepad|null>) {
        for (const [i, gamepad] of gamepads.entries()) {
            if (gamepad && gamepad.buttons.length > 0 &&
                gamepad.buttons[0]!.pressed) {
                this.gamepadIndex = i;
                this.pollActiveGamepad(gamepads);
                return;
            }
        }
    }

    private pollActiveGamepad(gamepads: Array<Gamepad|null>) {
        if (this.gamepadIndex === undefined) {
            this.pollForActiveGamepad(gamepads);
            return;
        }

        const gamepad = gamepads[this.gamepadIndex];
        if (!gamepad) {
            this.gamepadIndex = undefined;
            this.pollForActiveGamepad(gamepads);
            return;
        }

        this.pollGamepadButton(gamepad, 0, 38);  // Jump
        if (gamepad.buttons.length >= 2) {
            this.pollGamepadButton(gamepad, 1, 40);  // Duck
        }
        if (gamepad.buttons.length >= 10) {
            this.pollGamepadButton(gamepad, 9, 13);  // Restart
        }

        this.previousGamepad = gamepad;
    }

    private pollGamepadButton(
        gamepad: Gamepad, buttonIndex: number, keyCode: number) {
        const state = gamepad.buttons[buttonIndex]?.pressed || false;
        let previousState = false;
        if (this.previousGamepad) {
            previousState =
                this.previousGamepad.buttons[buttonIndex]?.pressed || false;
        }
        if (state !== previousState) {
            const e = new KeyboardEvent(
                state ? RunnerEvents.KEYDOWN : RunnerEvents.KEYUP,
                {keyCode: keyCode});
            document.dispatchEvent(e);
        }
    }

    private handleGameOverClicks(e: Event) {
        if (e.target !== this.slowSpeedCheckbox) {
            assert(this.distanceMeter);
            e.preventDefault();
            if (this.distanceMeter.hasClickedOnHighScore(e) && this.highestScore) {
                if (this.distanceMeter.isHighScoreFlashing()) {
                    this.saveHighScore(0, true);
                    this.distanceMeter.resetHighScore();
                } else {
                    this.distanceMeter.startHighScoreFlashing();
                }
            } else {
                this.distanceMeter.cancelHighScoreFlashing();
                this.restart();
            }
        }
    }

    private isLeftClickOnCanvas(e: Event): boolean {
        if (!(e instanceof MouseEvent)) {
            return false;
        }

        return e.button != null && e.button < 2 &&
            e.type === RunnerEvents.POINTERUP &&
            (e.target === this.canvas ||
                (IS_MOBILE && this.hasAudioCuesInternal &&
                    e.target === this.containerEl));
    }

    private scheduleNextUpdate() {
        if (!this.updatePending) {
            this.updatePending = true;
            this.raqId = requestAnimationFrame(this.update.bind(this));
        }
    }

    private isRunning(): boolean {
        return !!this.raqId;
    }

    private static readonly HIGH_SCORE_KEY = 'dino-high-score';

    private static loadHighScore(): number {
        try {
            return parseInt(localStorage.getItem(Runner.HIGH_SCORE_KEY) ?? '0', 10) || 0;
        } catch {
            return 0;
        }
    }

    private static persistHighScore(score: number) {
        try {
            localStorage.setItem(Runner.HIGH_SCORE_KEY, String(score));
        } catch {}
    }

    private saveHighScore(displayScore: number, resetScore?: boolean) {
        assert(this.distanceMeter);
        if (!resetScore) {
            this.highestScore = Math.ceil(displayScore);
        } else {
            this.highestScore = 0;
        }
        Runner.persistHighScore(this.highestScore);
        this.distanceMeter.setHighScoreDisplay(this.highestScore);
    }

    private gameOver() {
        assert(this.distanceMeter);
        assert(this.tRex);
        assert(this.containerEl);
        this.generatedSoundFx?.hit();
        vibrate(200);

        this.stop();
        this.crashed = true;
        this.distanceMeter.achievement = false;

        this.tRex.update(100, TrexStatus.CRASHED);

        if (this.isAmbient) {
            // Silently restart after a short pause — no game-over screen in ambient mode.
            setTimeout(() => { if (ambientInstance === this) this.restart(); }, 1500);
            this.time = getTimeStamp();
            return;
        }

        if (!this.gameOverPanel) {
            const origSpriteDef = IS_HIDPI ? spriteDefinitionByType.original.hdpi :
                spriteDefinitionByType.original.ldpi;

            if (this.canvas) {
                this.gameOverPanel = new GameOverPanel(
                    this.canvas, origSpriteDef.textSprite, origSpriteDef.restart,
                    this.dimensions, this);
            }
        }

        assert(this.gameOverPanel);
        this.gameOverPanel.draw(false, this.tRex);

        const currentDisplay = this.distanceMeter.getActualDistance(this.distanceRan);
        if (currentDisplay > this.highestScore) {
            this.saveHighScore(currentDisplay);
        }

        if (!Runner.isAmbientUnlocked() && currentDisplay >= 1000) {
            Runner.unlockAmbient();
        }

        this.onGameOver?.(currentDisplay);

        this.time = getTimeStamp();

        if (this.hasAudioCuesInternal) {
            this.generatedSoundFx?.stopAll();
        }
        this.showSpeedToggle();
        this.disableSpeedToggle(false);
    }

    private stop() {
        this.setPlayStatus(false);
        this.paused = true;
        cancelAnimationFrame(this.raqId);
        this.raqId = 0;
        if (this.hasAudioCuesInternal) {
            this.generatedSoundFx?.stopAll();
        }
    }

    private play() {
        if (!this.crashed) {
            assert(this.tRex);
            this.setPlayStatus(true);
            this.paused = false;
            this.tRex.update(0, TrexStatus.RUNNING);
            this.ambientFixTrexPos();
            this.time = getTimeStamp();
            this.update();
            if (this.hasAudioCuesInternal) {
                this.generatedSoundFx?.background();
            }
        }
    }

    private restart() {
        if (!this.raqId) {
            assert(this.containerEl);
            assert(this.tRex);
            assert(this.horizon);
            assert(this.distanceMeter);
            this.playCount++;
            this.runningTime = 0;
            this.setPlayStatus(true);
            this.toggleSpeed();
            this.paused = false;
            this.crashed = false;
            this.distanceRan = 0;
            this.setSpeed(this.config.speed);
            this.time = getTimeStamp();
            this.containerEl.classList.remove(RunnerClasses.CRASHED);
            this.clearCanvas();
            this.distanceMeter.reset();
            this.horizon.reset();
            this.tRex.reset();
            this.ambientFixTrexPos();
            this.generatedSoundFx?.jump();
            this.invert(true);
            this.update();
            this.gameOverPanel?.reset();
            if (this.hasAudioCuesInternal) {
                this.generatedSoundFx?.background();
            }
        }
    }

    private setPlayStatus(isPlaying: boolean) {
        if (this.touchController) {
            this.touchController.classList.toggle('hidden', !isPlaying);
        }
        this.playing = isPlaying;
    }

    private onVisibilityChange(e: Event) {
        if (document.hidden || e.type === 'blur' ||
            document.visibilityState !== 'visible') {
            this.stop();
        } else if (!this.crashed) {
            assert(this.tRex);
            this.tRex.reset();
            this.play();
        }
    }

    private invert(reset: boolean) {
        if (reset) {
            this.invertTimer = 0;
            this.inverted = false;
        } else {
            this.inverted = this.invertTrigger;
        }
        this.onInvertChange?.(this.inverted);
    }

    private announcePhrase(phrase: string) {
        if (this.a11yStatusEl) {
            this.a11yStatusEl.textContent = '';
            this.a11yStatusEl.textContent = phrase;
        }
    }

    private checkForCollision(
        obstacle: Obstacle, tRex: Trex,
        canvasCtx?: CanvasRenderingContext2D,
        shrink: number = 0): CollisionBox[]|null {
        const tRexBox = new CollisionBox(
            tRex.xPos + 1 + shrink, tRex.yPos + 1 + shrink,
            tRex.config.width - 2 - shrink * 2,
            tRex.config.height - 2 - shrink * 2);

        const obstacleBox = new CollisionBox(
            obstacle.xPos + 1, obstacle.yPos + 1,
            obstacle.typeConfig.width * obstacle.size - 2,
            obstacle.typeConfig.height - 2);

        if (canvasCtx) {
            drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox);
        }

        if (boxCompare(tRexBox, obstacleBox)) {
            const collisionBoxes = obstacle.collisionBoxes;
            const tRexCollisionBoxes = tRex.getCollisionBoxes();

            for (const tRexCollisionBox of tRexCollisionBoxes) {
                for (const obstacleCollixionBox of collisionBoxes) {
                    const adjTrexBox =
                        createAdjustedCollisionBox(tRexCollisionBox, tRexBox);
                    const adjObstacleBox =
                        createAdjustedCollisionBox(obstacleCollixionBox, obstacleBox);
                    const crashed = boxCompare(adjTrexBox, adjObstacleBox);

                    if (canvasCtx) {
                        drawCollisionBoxes(canvasCtx, adjTrexBox, adjObstacleBox);
                    }

                    if (crashed) {
                        return [adjTrexBox, adjObstacleBox];
                    }
                }
            }
        }

        return null;
    }

    destroy() {
        this.stop();
        this.stopListening();
        if (this.raqId) {
            cancelAnimationFrame(this.raqId);
            this.raqId = 0;
        }
        if (this.generatedSoundFx) {
            this.generatedSoundFx.stopAll();
        }
        if (this.containerEl && this.outerContainerEl.contains(this.containerEl)) {
            this.outerContainerEl.removeChild(this.containerEl);
        }
        if (this.slowSpeedCheckboxLabel &&
            this.outerContainerEl.contains(this.slowSpeedCheckboxLabel)) {
            this.outerContainerEl.removeChild(this.slowSpeedCheckboxLabel);
        }
        if (this.touchController &&
            this.outerContainerEl.contains(this.touchController)) {
            this.outerContainerEl.removeChild(this.touchController);
        }
        this.invert(true);
    }
}


function updateCanvasScaling(
    canvas: HTMLCanvasElement, width?: number, height?: number): boolean {
    const context = canvas.getContext('2d');
    assert(context);

    const devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
    const backingStoreRatio = ('webkitBackingStorePixelRatio' in context) ?
        Math.floor((context as any).webkitBackingStorePixelRatio as number) :
        1;
    const ratio = devicePixelRatio / backingStoreRatio;

    if (devicePixelRatio !== backingStoreRatio) {
        const oldWidth = width || canvas.width;
        const oldHeight = height || canvas.height;

        canvas.width = oldWidth * ratio;
        canvas.height = oldHeight * ratio;

        canvas.style.width = oldWidth + 'px';
        canvas.style.height = oldHeight + 'px';

        context.scale(ratio, ratio);
        return true;
    } else if (devicePixelRatio === 1) {
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
    }
    return false;
}


function vibrate(duration: number) {
    if (IS_MOBILE && window.navigator.vibrate) {
        window.navigator.vibrate(duration);
    }
}


function createCanvas(
    container: Element, width: number, height: number,
    classname?: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className =
        classname ? RunnerClasses.CANVAS + ' ' + classname : RunnerClasses.CANVAS;
    canvas.width = width;
    canvas.height = height;
    canvas.style.outline = 'none';
    container.appendChild(canvas);
    return canvas;
}


function createAdjustedCollisionBox(
    box: CollisionBox, adjustment: CollisionBox): CollisionBox {
    return new CollisionBox(
        box.x + adjustment.x, box.y + adjustment.y, box.width, box.height);
}


function drawCollisionBoxes(
    canvasCtx: CanvasRenderingContext2D, tRexBox: CollisionBox,
    obstacleBox: CollisionBox) {
    canvasCtx.save();
    canvasCtx.strokeStyle = '#f00';
    canvasCtx.strokeRect(tRexBox.x, tRexBox.y, tRexBox.width, tRexBox.height);

    canvasCtx.strokeStyle = '#0f0';
    canvasCtx.strokeRect(
        obstacleBox.x, obstacleBox.y, obstacleBox.width, obstacleBox.height);
    canvasCtx.restore();
}


function boxCompare(tRexBox: CollisionBox, obstacleBox: CollisionBox): boolean {
    const tRexBoxX = tRexBox.x;
    const tRexBoxY = tRexBox.y;

    const obstacleBoxX = obstacleBox.x;
    const obstacleBoxY = obstacleBox.y;

    if (tRexBoxX < obstacleBoxX + obstacleBox.width &&
        tRexBoxX + tRexBox.width > obstacleBoxX &&
        tRexBoxY < obstacleBoxY + obstacleBox.height &&
        tRexBox.height + tRexBoxY > obstacleBoxY) {
        return true;
    }

    return false;
}
