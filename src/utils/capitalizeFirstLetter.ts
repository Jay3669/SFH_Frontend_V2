export function capitalizeFirstLetter(value: string) {
  const match = value.match(/^(\s*)(\p{L})/u)
  if (!match) return value
  return `${match[1]}${match[2].toLocaleUpperCase()}${value.slice(match[0].length)}`
}
