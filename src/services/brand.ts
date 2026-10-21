const KEY = 'delulutab:brand-logo'
const MAX = 350_000

export function readBrandLogo(): string | null {
  try {
    const value = localStorage.getItem(KEY)
    return value && value.startsWith('data:image/') ? value : null
  } catch {
    return null
  }
}

export function saveBrandLogo(dataUrl: string | null) {
  try {
    if (!dataUrl) localStorage.removeItem(KEY)
    else if (dataUrl.startsWith('data:image/') && dataUrl.length <= MAX) localStorage.setItem(KEY, dataUrl)
  } catch {
    // A blocked store just keeps the built-in mark.
  }
  window.dispatchEvent(new Event('delulutab:brand'))
}

/** Shrinks an uploaded mark so it fits in local storage and stays sharp at header size. */
export function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('That image could not be read.'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 128
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Could not prepare that image.'))
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('That file is not an image.'))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
