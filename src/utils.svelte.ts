import type { 품목리스트항목타입, 개별품목정보, 제품정보타입 } from "./type";
import { writable } from "svelte/store";

const useDev = import.meta.env.MODE === "development";

export const FORCED = writable(false);
let realForced = $state(false);

FORCED.subscribe(value => {
  realForced = value;
});

export function setForced(value: boolean) {
  FORCED.set(value);
}

export function 숫자로변환(value: any, alternative: number | undefined = undefined): number {
  const 반환할값 = parseInt(String(value), 10);

  // 1. parseInt 결과가 유효한 숫자(NaN이 아님)인지 확인합니다.
  if (!isNaN(반환할값)) {
    return 반환할값;
  }

  // 2. 변환에 실패했을 경우 alternative를 반환합니다.
  return alternative ?? 0;
}

export function 로케일숫자로표시(값: string | number | undefined) {
  if (!값) return 0;
  return String(값).endsWith(".") ? 값 : Intl.NumberFormat("ko-KR").format(parseFloat(String(값)));
}

export const isHTMLElement = (element: any) => element instanceof HTMLElement || element instanceof HTMLInputElement;

export function 계산_도매가(sell: number, margin: number) {
  return (sell * (100 - margin)) / 100;
}

export function 계산_마진(sell: number, dome: number) {
  return 100 - (dome / sell) * 100;
}

export function 내용리셋(품목: 품목리스트항목타입, 품목명유지 = false) {
  if (!품목명유지) 품목.productInfo.product = "";
  if (!품목명유지) 품목.productInfo.PROD_CD = "";
  품목.productInfo.sell_price = 0;
  품목.productInfo.dome_price = 0;
  품목.productInfo.total_dome = 0;
  품목.productInfo.useprop = false;
  품목.productInfo.soldout = false;
  품목.default_margin = undefined;
}

export async function 품목가져오기(): Promise<any> {
  try {
    const body: {
      key: string;
      restrict: boolean;
      mb_id?: string;
    } = {
      key: "b2b_write",
      restrict: realForced,
    };

    const headers : Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (useDev) {
      body.mb_id = "test";
      headers.UseDev = "true";
    }

    const 품목가져오기 = await fetch("https://b2b.soundcat.com/page/get_products.php", {
      headers,
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!품목가져오기.ok) {
      throw new Error(`서버 응답 오류: ${품목가져오기.status}`);
    }

    return await 품목가져오기.json();
  } catch (err) {
    console.error("품목 로딩 실패:", err);
    alert("오류가 발생하여 전체 품목 리스트를 가져오지 못했습니다. 품목을 수동으로 입력하여 작성이 가능합니다.");
    return null;
  }
}

/**
 * 문자열을 2글자씩 자르는 함수입니다.
 * @param str 자를 문자열
 * @returns 문자열을 2글자씩 잘라 배열로 반환한다.
 */
export function bigrams(str: string): string[] {
  return Array.from({ length: str.length - 1 }, (_, i) => // length는 배열의 개수
    str.slice(i, i + 2) // str 문자열을 자르되 i는 배열이 초기화 될때의 인덱스 값을 가지므로 i부터 i+2까지 자른 문자열을 반환한다. 예를 들어 "hello"라는 문자열이 있다면 bigrams("hello")는 ["he", "el", "ll", "lo"]를 반환한다.
);
}

/**
 * 두 문자열의 유사도를 계산하는 함수입니다. 유사도는 두 문자열의 bigrams를 비교하여 계산됩니다. 반환값은 0과 1 사이의 숫자로, 1에 가까울수록 두 문자열이 유사하다는 것을 의미합니다.
 * @param str1 첫 번째 문자열
 * @param str2 두 번째 문자열
 * @returns 두 문자열의 유사도를 나타내는 숫자 (0과 1 사이)
 */
export function similarity(str1: string[], str2: string[]): number {
  const bigrams1 = new Set((str1));
  const bigrams2 = new Set((str2));
  
  const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function tokenScore(queryTokens: string[], docText: string, limit = 0): number {
  const lowerDoc = docText.toLowerCase().split(/\s+/);

  let match = 0;
  for (const token of queryTokens) {
    if (lowerDoc.includes(token)) match++;
  }


  if (limit && match < limit) return 0;

  return match / queryTokens.length;
}

export function 품목정보가져오기 (PROD_CD: string, 전체품목: 개별품목정보[]|개별품목정보): 제품정보타입 | undefined {
  const item = Array.isArray(전체품목)?전체품목.find(item => item.PROD_CD === PROD_CD):전체품목;
  if (!item) return undefined;
  return {
    itemType: 0,
    brand: item.brand,
    product: item.product,
    PROD_CD: item.PROD_CD,
    prop: item.custom_option,
    useprop: !!item.custom_option,
    sell_price: 숫자로변환(item.price),
    dome_price: item.price && item.default_margin ? 계산_도매가(숫자로변환(item.price), 숫자로변환(item.default_margin.default_margin)) : undefined,
    qty: undefined,
    margin: item.default_margin ? 숫자로변환(item.default_margin.default_margin) : undefined,
    total_dome: item.price && item.default_margin ? 계산_도매가(숫자로변환(item.price), 숫자로변환(item.default_margin.default_margin)) : undefined,
    soldout: item.soldout === "1",
  }
}