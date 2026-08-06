// 유머 썸네일 생성 이음새(seam) — 이미지가 없는 유머 글의 대표 이미지를 서버에서 그려온다.
// gatheringImage.ts / marketImage.ts 와 같은 규약: VITE_HUMOR_IMAGE_ENDPOINT 가 없으면
// 조용히 휴면하고 호출부는 썸네일 없이 글을 그대로 둔다.
//
// 서버 함수(api/gathering-image)는 모임·물건·유머를 함께 처리한다. 유머는 { humor: { body } }
// 형태로 보내면 '우스운 장면 하나를 크레파스로' 그려 돌려준다. 화풍은 서버가 갖고, 프론트는 사실만 넘긴다.
// data URI → File 변환은 gatheringImage 와 공유한다(첨부 사진과 같은 업로드 경로를 태우려고).
import { fileFromDataUri } from './gatheringImage';
import type { HumorPost } from './types';

function endpoint() {
  return (import.meta.env as Record<string, string | undefined>).VITE_HUMOR_IMAGE_ENDPOINT || undefined;
}

/**
 * 유머 썸네일을 만들어 File 로 돌려준다.
 * 엔드포인트가 없거나, 생성이 실패하거나, 글자를 못 지웠으면 null —
 * 호출부는 "없으면 썸네일 없이" 한 갈래만 다루면 된다.
 */
export async function requestHumorImage(post: HumorPost): Promise<File | null> {
  const url = endpoint();
  if (!url) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ humor: { body: post.body } }),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; dataUri?: string } | null;
    if (!data?.ok || !data.dataUri) return null;
    return fileFromDataUri(data.dataUri, post.id);
  } catch {
    return null;
  }
}
