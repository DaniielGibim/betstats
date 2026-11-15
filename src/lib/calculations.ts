export function calcularLucroPrejuizo(
  stake: number,
  odd: number,
  status: string
): number | null {
  switch (status) {
    case "GREEN":
      return Number((stake * (odd - 1)).toFixed(2));
    case "RED":
      return Number((-stake).toFixed(2));
    case "REEMBOLSO":
      return 0.0;
    case "MEIO_GREEN":
      return Number(((stake / 2) * (odd - 1)).toFixed(2));
    case "MEIO_RED":
      return Number((-(stake / 2)).toFixed(2));
    case "PENDENTE":
    default:
      return null;
  }
}
