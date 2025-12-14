declare module "@noble/curves/p256" {
    export const p256: any;
}

declare module "@noble/hashes/sha256" {
    export const sha256: any;
}

declare module "@noble/hashes/hkdf" {
    export function hkdf(hash: any, ikm: Uint8Array, salt: Uint8Array | undefined, info: string | Uint8Array | undefined, len: number): Uint8Array;
}

declare module "@noble/hashes/utils" {
    export function randomBytes(len: number): Uint8Array;
}