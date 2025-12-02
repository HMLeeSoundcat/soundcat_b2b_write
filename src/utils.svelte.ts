export function 숫자로변환(value: any, alternative: number | undefined = undefined): number {
  const 반환할값 = parseInt(String(value), 10);

  // 1. parseInt 결과가 유효한 숫자(NaN이 아님)인지 확인합니다.
  if (!isNaN(반환할값)) {
    return 반환할값;
  }

  // 2. 변환에 실패했을 경우 alternative를 반환합니다.
  return alternative ?? 0;
}
