// Performance-optimized ANSI stripping.
// Uses Bun's native C++ implementation when available (~5-10x faster),
// falls back to the strip-ansi npm package.
// Aligned with upstream v2.1.91: "stripAnsi routes through Bun.stripANSI"
import stripAnsiNpm from 'strip-ansi'

const bunStripANSI: ((str: string) => string) | null =
  typeof Bun !== 'undefined' && typeof (Bun as any).stripANSI === 'function'
    ? (Bun as any).stripANSI
    : null

const stripAnsi: (str: string) => string = bunStripANSI ?? stripAnsiNpm

export default stripAnsi
