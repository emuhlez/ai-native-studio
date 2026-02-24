/** Strip leading [...] blocks (including nested brackets) from display text.
 *  Also handles truncated brackets (e.g. "[Context: the user circ...")
 *  where the closing ] was cut off by a .slice(). */
export function stripLeadingBrackets(text: string): string {
  let result = text
  while (result.startsWith('[')) {
    let depth = 0
    let end = -1
    for (let i = 0; i < result.length; i++) {
      if (result[i] === '[') depth++
      else if (result[i] === ']') {
        depth--
        if (depth === 0) { end = i; break }
      }
    }
    if (end === -1) {
      // Truncated bracket with no closing ] — entire string is bracket content
      return ''
    }
    result = result.slice(end + 1).trimStart()
  }
  return result
}
