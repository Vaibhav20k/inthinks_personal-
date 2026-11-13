/**
 * File safety at upload.
 *
 * This is NOT malware scanning. It checks that a file's first bytes agree with
 * its extension, refuses executables whatever they are called, and labels
 * formats that can carry active content (macros, archives) so the person who
 * releases them from quarantine knows what to inspect. Every file is stored
 * quarantined (migrations/0015_file_quarantine.sql) until a human releases it.
 */

export interface Sniffed { ok: true; detected: string; risk: 'standard' | 'inspect' }
export interface Refused { ok: false; reason: string }

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b)
const ascii = (bytes: Uint8Array, text: string, offset = 0) =>
  startsWith(bytes, [...text].map((c) => c.charCodeAt(0)), offset)

const ZIP = [0x50, 0x4b, 0x03, 0x04]
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

/** Executable headers refused under any extension. */
function executable(bytes: Uint8Array) {
  return ascii(bytes, 'MZ') // Windows PE
    || startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46]) // ELF
    || startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) || startsWith(bytes, [0xfe, 0xed, 0xfa, 0xcf]) // Mach-O
    || startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe]) // Mach-O fat / Java class
    || ascii(bytes, '#!') // script with an interpreter line
}

/** Plain text: no NUL bytes in the sampled head. */
function looksText(bytes: Uint8Array) {
  return !bytes.includes(0)
}
function looksHtml(bytes: Uint8Array) {
  const head = new TextDecoder().decode(bytes.slice(0, 512)).trimStart().toLowerCase()
  return head.startsWith('<!doctype html') || head.startsWith('<html') || head.startsWith('<script') || head.startsWith('<svg')
}

/**
 * Checks the head of a file (the first 4 KB is enough) against its extension.
 * Empty files are refused: they carry no evidence and hide nothing worth keeping.
 */
export function sniff(extension: string, head: Uint8Array): Sniffed | Refused {
  if (head.length === 0) return { ok: false, reason: 'is empty' }
  if (executable(head)) return { ok: false, reason: 'looks like a program, which is not accepted' }
  const ftyp = ascii(head, 'ftyp', 4)
  const checks: Record<string, () => Sniffed | null> = {
    pdf: () => ascii(head, '%PDF-') ? { ok: true, detected: 'pdf', risk: 'inspect' } : null,
    png: () => startsWith(head, [0x89, 0x50, 0x4e, 0x47]) ? { ok: true, detected: 'png', risk: 'standard' } : null,
    jpg: () => startsWith(head, [0xff, 0xd8, 0xff]) ? { ok: true, detected: 'jpeg', risk: 'standard' } : null,
    gif: () => ascii(head, 'GIF8') ? { ok: true, detected: 'gif', risk: 'standard' } : null,
    webp: () => ascii(head, 'RIFF') && ascii(head, 'WEBP', 8) ? { ok: true, detected: 'webp', risk: 'standard' } : null,
    tif: () => startsWith(head, [0x49, 0x49, 0x2a, 0x00]) || startsWith(head, [0x4d, 0x4d, 0x00, 0x2a]) ? { ok: true, detected: 'tiff', risk: 'standard' } : null,
    heic: () => ftyp ? { ok: true, detected: 'heic', risk: 'standard' } : null,
    mp4: () => ftyp ? { ok: true, detected: 'iso-media', risk: 'standard' } : null,
    webm: () => startsWith(head, [0x1a, 0x45, 0xdf, 0xa3]) ? { ok: true, detected: 'webm', risk: 'standard' } : null,
    // Office Open XML and zip archives can hold anything; flag for inspection.
    zip: () => startsWith(head, ZIP) ? { ok: true, detected: 'zip', risk: 'inspect' } : null,
    docx: () => startsWith(head, ZIP) ? { ok: true, detected: 'office-open-xml', risk: 'inspect' } : null,
    // Legacy Office binaries are the classic macro carrier.
    doc: () => startsWith(head, OLE) ? { ok: true, detected: 'ole-compound', risk: 'inspect' } : null,
    dwg: () => ascii(head, 'AC10') ? { ok: true, detected: 'dwg', risk: 'standard' } : null,
    stl: () => ({ ok: true, detected: looksText(head) ? 'stl-ascii' : 'stl-binary', risk: 'standard' }),
    txt: () => looksText(head) && !looksHtml(head) ? { ok: true, detected: 'text', risk: 'standard' } : null,
  }
  const alias: Record<string, string> = {
    jpeg: 'jpg', tiff: 'tif', mov: 'mp4', xlsx: 'docx', pptx: 'docx', xls: 'doc', ppt: 'doc',
    csv: 'txt', md: 'txt', dxf: 'txt', step: 'txt', stp: 'txt', iges: 'txt', igs: 'txt',
  }
  const check = checks[alias[extension] ?? extension]
  if (!check) return { ok: false, reason: 'is not an accepted file type' }
  return check() ?? { ok: false, reason: `does not contain what a .${extension} file should` }
}

/** Reads only the head of an uploaded file. */
export async function fileHead(file: File) {
  return new Uint8Array(await file.slice(0, 4096).arrayBuffer())
}
