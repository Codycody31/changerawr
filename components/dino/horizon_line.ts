// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from './utils';

import {FPS, IS_HIDPI} from './constants';
import type {Dimensions} from './dimensions';
import type {ImageSpriteProvider} from './image_sprite_provider';
import type {SpritePosition} from './sprite_position';


export interface HorizonLineConfig {
    sourceX: number;
    sourceY: number;
    width: number;
    height: number;
    yPos: number;
}

export class HorizonLine {
    private canvasCtx: CanvasRenderingContext2D;
    private xPos: number[];
    private sourceXPos: number[];
    private yPos: number = 0;
    private bumpThreshold: number = 0.5;
    private spritePos: SpritePosition;
    private sourceDimensions: Dimensions;
    private dimensions: Dimensions;
    private imageSpriteProvider: ImageSpriteProvider;

    /**
     * Horizon Line.
     * Tiles the ground sprite across the full canvas width rather than using
     * the original fixed 2-tile approach, so wide viewports are covered.
     */
    constructor(
        canvas: HTMLCanvasElement, lineConfig: HorizonLineConfig,
        imageSpriteProvider: ImageSpriteProvider) {
        let sourceX = lineConfig.sourceX;
        let sourceY = lineConfig.sourceY;

        if (IS_HIDPI) {
            sourceX *= 2;
            sourceY *= 2;
        }

        this.spritePos = {x: sourceX, y: sourceY};
        const canvasContext = canvas.getContext('2d');
        assert(canvasContext);
        this.canvasCtx = canvasContext;
        this.dimensions = {width: lineConfig.width, height: lineConfig.height};
        this.imageSpriteProvider = imageSpriteProvider;

        this.sourceDimensions = {
            height: lineConfig.height,
            width: lineConfig.width,
        };
        if (IS_HIDPI) {
            this.sourceDimensions.width = lineConfig.width * 2;
            this.sourceDimensions.height = lineConfig.height * 2;
        }

        // Calculate enough tiles to cover the viewport width at all times.
        const logicalWidth =
            typeof window !== 'undefined' ? (window.innerWidth || 1200) : 1200;
        const numTiles = Math.max(2, Math.ceil(logicalWidth / this.dimensions.width) + 2);

        this.xPos = Array.from({length: numTiles}, (_, i) => i * this.dimensions.width);
        this.sourceXPos = Array.from({length: numTiles}, () =>
            this.getRandomType() + this.spritePos.x);

        this.yPos = lineConfig.yPos;
        this.draw();
    }

    /**
     * Return the crop x position of a type.
     */
    getRandomType() {
        return Math.random() > this.bumpThreshold ? this.dimensions.width : 0;
    }

    /**
     * Draw all ground tiles.
     */
    draw() {
        const runnerImageSprite = this.imageSpriteProvider.getRunnerImageSprite();
        assert(runnerImageSprite);
        for (let i = 0; i < this.xPos.length; i++) {
            this.canvasCtx.drawImage(
                runnerImageSprite, this.sourceXPos[i]!, this.spritePos.y,
                this.sourceDimensions.width, this.sourceDimensions.height,
                this.xPos[i]!, this.yPos, this.dimensions.width, this.dimensions.height);
        }
    }

    /**
     * Move all tiles left by increment, wrapping any that fall off the left edge.
     * The `pos` parameter is kept for API compatibility but is unused.
     */
    updatexPos(_pos: 0|1, increment: number) {
        for (let i = 0; i < this.xPos.length; i++) {
            this.xPos[i]! -= increment;
        }
        const maxX = Math.max(...this.xPos);
        for (let i = 0; i < this.xPos.length; i++) {
            if (this.xPos[i]! + this.dimensions.width <= 0) {
                this.xPos[i] = maxX + this.dimensions.width;
                this.sourceXPos[i] = this.getRandomType() + this.spritePos.x;
            }
        }
    }

    /**
     * Update the horizon line.
     */
    update(deltaTime: number, speed: number) {
        const increment = Math.floor(speed * (FPS / 1000) * deltaTime);
        this.updatexPos(this.xPos[0]! <= 0 ? 0 : 1, increment);
        this.draw();
    }

    /**
     * Reset all tiles to their initial positions.
     */
    reset() {
        for (let i = 0; i < this.xPos.length; i++) {
            this.xPos[i] = i * this.dimensions.width;
        }
    }
}
