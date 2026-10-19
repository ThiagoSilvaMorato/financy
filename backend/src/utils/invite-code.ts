import crypto from "node:crypto";

// Sem 0/O, 1/I/L — reduz erro de leitura/digitação ao compartilhar o código manualmente.
const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 8;

/**
 * Gera um código de convite aleatório de 8 caracteres (32^8 combinações possíveis). Colisão com
 * um código de outro ambiente é extremamente improvável, mas quem chama deve tratar o caso
 * (gerar de novo e tentar outra vez) em vez de deixar o `unique` do banco estourar.
 */
export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[crypto.randomInt(0, INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

/** trim + uppercase — normalização usada antes de qualquer consulta por código digitado. */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}
