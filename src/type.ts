export type 배송형태종류타입 = (typeof 배송형태종류)[number];

export interface 품목리스트항목타입 {
  uuid: string;
  productInfo: 제품정보타입;
  deliveryInfo: 배송정보타입;
  collapsed: boolean;
  failed: boolean;
  default_margin?: 마진셋업타입;
}

export interface 제품정보타입 {
  itemType: 0 | 1 | 2 | 3;
  brand: string | undefined;
  product: string | undefined;
  PROD_CD: string | undefined;
  prop: string | undefined;
  useprop: boolean;
  sell_price: number | undefined;
  dome_price: number | undefined;
  qty: number | undefined;
  margin: number | undefined;
  total_dome: number | undefined;
  soldout: boolean;
}

export interface 배송정보타입 {
  name: string | undefined;
  hp1: string | undefined;
  hp2: string | undefined;
  addr1: string | undefined;
  addr2: string | undefined;
  addr3: string | undefined;
  postcode: string | undefined;
  msg: string | undefined;
}

export interface 전체품목리스트 {
  [key: string]: 개별품목정보[];
}

export interface 개별품목정보 {
  brand: string | undefined;
  brand_kor: string | undefined;
  PROD_CD: string | undefined;
  product: string | undefined;
  carton: string | undefined;
  price: string | undefined;
  software: string | undefined;
  bypass_soldout: string | undefined;
  soldout: string | undefined;
  fixed_stock: string | undefined;
  custom_option: string | undefined;
  add_date: string | undefined;
  whitelist_user: string | undefined;
  blacklist_user: string | undefined;
  zerostock: number | undefined;
  stock_level: number | undefined;
  default_margin: 마진셋업타입 | undefined;
}

export interface 개별마진타입 {
  default_margin: number | string | undefined;
  default_prov: number | string | undefined;
  discount_margin: number | string | undefined;
  discount_price: number | string | undefined;
  discount_qty: number | string | undefined;
}

export interface 마진셋업타입 extends 개별마진타입 {
  per_user: 개별마진타입 | null;
  brand_disc_amount?: number | string | undefined;
}

export interface 임시배열타입 {
  product: string | undefined;
  PROD_CD: string | undefined;
  brand: string | undefined;
  soldout: number | undefined;
  bypass_soldout: number | undefined;
  software: string | undefined;
  stock_level?: number;
  checking?: boolean;
}

export interface 선택상자호출자타입 {
  요소: HTMLElement | undefined;
  인덱스: number;
  품목: 품목리스트항목타입 | undefined;
  유형: string | null | undefined;
}

export const 배송형태종류 = ["익일수령택배", "방문수령", "퀵착불", "퀵선불", "대리배송", "전자배송", ""] as const;
