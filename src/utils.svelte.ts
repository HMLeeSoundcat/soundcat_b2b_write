import type { 품목리스트항목타입 } from "./type";

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
  품목.manual_mode = false;
  품목.default_margin = undefined;
}
