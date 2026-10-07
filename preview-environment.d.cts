export function previewOriginFromHost(host: unknown): string;
export function previewOriginFromEnvironment(env?: Record<string, string | undefined>): string;
export function validatePreviewOrigin(origin: unknown): string;
export function isStagingPreview(env?: Record<string, string | undefined>): boolean;
