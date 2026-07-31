export const MAX_REVISION_LABEL_LENGTH = 60;

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Returns true if `color` is null/undefined or a valid 6-digit hex color. */
export function isValidRevisionColor(color: string | null | undefined): boolean {
    return color == null || HEX_COLOR_PATTERN.test(color);
}
