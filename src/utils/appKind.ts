export type AppKind = "game" | "program";

export function appKindLabel(kind: AppKind): string {
  return kind === "game" ? "게임" : "프로그램";
}
