import { toBlob } from "html-to-image";

const options = {
  pixelRatio: 2,
  cacheBust: true,
  // 오프스크린 배치 좌표가 결과에 반영되지 않도록 캡처 시 위치를 초기화.
  style: { margin: "0", left: "0", top: "0", position: "static" } as Record<string, string>,
};

async function render(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, options);
  if (!blob) throw new Error("이미지 생성 실패");
  return blob;
}

/** 사양 카드를 PNG 파일로 다운로드한다. */
export async function downloadSpecImage(node: HTMLElement, filename: string): Promise<void> {
  const blob = await render(node);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
