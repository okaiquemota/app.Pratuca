export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_DIMENSION = 1200

export class ImageValidationError extends Error {}

export function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new ImageValidationError('Formato não suportado. Envie uma imagem JPG, PNG ou WebP.')
  }
  // Fotos de celular costumam ser grandes; reduzimos antes do envio.
  if (file.size > 15 * 1024 * 1024) {
    throw new ImageValidationError('Imagem muito grande. Escolha uma foto de até 15 MB.')
  }
}

/**
 * Redimensiona para no máximo 1200 px e converte para WebP quando
 * necessário, mantendo o arquivo final abaixo de 2 MB (limite do bucket).
 */
export async function prepareImage(file: File): Promise<Blob> {
  validateImageFile(file)
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    if (file.size > MAX_IMAGE_BYTES) throw new ImageValidationError('A imagem precisa ter no máximo 2 MB.')
    return file
  }
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= MAX_IMAGE_BYTES) {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageValidationError('Não foi possível processar a imagem.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  if (!blob || blob.size > MAX_IMAGE_BYTES) throw new ImageValidationError('A imagem precisa ter no máximo 2 MB.')
  return blob
}

export function extensionFor(type: string): string {
  return type === 'image/png' ? 'png' : type === 'image/jpeg' ? 'jpg' : 'webp'
}
