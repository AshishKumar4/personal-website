function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordPBKDF2(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );
    return bytesToHex(new Uint8Array(hashBuffer));
}

async function hashPasswordLegacySHA256(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    return bytesToHex(new Uint8Array(hashBuffer));
}

function generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return bytesToHex(array);
}

function generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return bytesToHex(array);
}

export { hashPasswordPBKDF2, hashPasswordLegacySHA256, generateSalt, generateSessionToken };
