/** Dias inteiros até a data (negativo se já passou). */
export function diasAte(data: string | Date): number {
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86_400_000)
}
