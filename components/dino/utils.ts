// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {IS_IOS} from './constants';

export function assert(condition: unknown, msg?: string): asserts condition {
    if (!condition) throw new Error(msg ?? 'Assertion failed');
}

export function getRandomNum(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Return the current timestamp.
 */
export function getTimeStamp(): number {
    return IS_IOS ? new Date().getTime() : performance.now();
}