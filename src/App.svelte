<script module>
  declare const Swal: typeof SwalType;
</script>

<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { fly } from "svelte/transition";
  import Portal from "svelte-portal";
  import type SwalType from "sweetalert2";
  import Selectbox from "./Selectbox.svelte";
  import { parseExcelWithWorker } from "./lib/parseExcel";
  import type { 개별품목정보, 배송정보타입, 배송형태종류타입, 선택상자호출자타입, 임시배열타입, 전체품목리스트, 제품정보타입, 품목리스트항목타입 } from "./type";
  import ExcelImport from "./ExcelImport.svelte";
  import { isHTMLElement, 로케일숫자로표시, 숫자로변환, 계산_도매가, 계산_마진, 내용리셋 } from "./utils.svelte";
  import Postinfo from "./Postinfo.svelte";

  const useDev = import.meta.env.MODE === "development";

  let 선택상자열림 = $state(false);
  let 선택상자항목: 임시배열타입[] = $state([]);
  let 선택상자요소배열: HTMLElement[] = $state([]);
  let 선택상자: HTMLElement | undefined = $state();
  let 선택상자호출자: 선택상자호출자타입 = $state({
    요소: undefined,
    인덱스: -1,
    품목: undefined,
    유형: undefined,
  });
  let 선택상자필터: 임시배열타입[] | undefined = $state();

  let 선택상자선택항목: number = $state(-1);
  let 직접입력선택상자: HTMLElement | undefined = $state();

  let 품절팝업열림: boolean = $state(false);
  let 품절팝업내용: HTMLElement | undefined = $state();
  let 전자배송팝업열림: boolean = $state(false);
  let 전자배송팝업내용: HTMLTextAreaElement | undefined = $state();

  let 우편번호검색열림: Record<string, boolean> = $state({});
  let 우편번호검색상자: Record<string, HTMLElement> = $state({});
  let 우편번호상세입력란: Record<string, HTMLElement> = $state({});

  let 기본주소:
    | {
        name: string;
        hp1: string;
        hp2: string;
        postcode: string;
        addr1: string;
        addr2: string;
        addr3: string;
      }
    | null
    | undefined = $state();

  let 품목명입력란: Record<string, HTMLElement> = $state({});

  let 발주서상태: string = $state("대기");
  let 컨테이너 = $state();

  let 전체품목: 전체품목리스트 = $state({} as 전체품목리스트);
  let 검색상자전체품목: 임시배열타입[] | undefined = $derived.by(() => {
    let 임시배열: 임시배열타입[] | undefined = undefined;
    Object.keys(전체품목).forEach(각브랜드 => {
      const items = 전체품목[각브랜드];
      if (Array.isArray(items)) {
        임시배열 = [
          ...(임시배열 ? 임시배열 : []),
          ...items.map((x: 개별품목정보) => {
            return { brand: x.brand, product: x.product, PROD_CD: x.PROD_CD, software: x.software, soldout: x.zerostock, stock_level: x.stock_level, bypass_soldout: parseInt(x.bypass_soldout ?? "0"), default_margin: x.default_margin };
          }),
        ];
      }
    });
    return 임시배열 ? 임시배열 : undefined;
  });

  const 배송형태종류 = ["익일수령택배", "방문수령", "퀵착불", "퀵선불", "대리배송", "전자배송", ""] as const;
  let 배송형태: 배송형태종류타입 | undefined = $state();

  let 품목리스트: 품목리스트항목타입[] = $state([]);
  if (useDev) $inspect(품목리스트);

  let 엑셀데이터: any[] = $state([]);
  let 엑셀데이터선택창: boolean = $state(false);
  let 엑셀파일선택: HTMLInputElement | undefined = $state();
  let 엑셀로딩: boolean = $state(false);

  function 배송형태변경(e: Event) {
    const 값 = (e.target as HTMLSelectElement).value;
    if (배송형태종류.includes(값 as any)) {
      배송형태 = 값 as 배송형태종류타입;
      if (값 === "익일수령택배") {
        품목리스트 = 품목리스트.map((x: 품목리스트항목타입) => {
          return {
            ...x,
            deliveryInfo: {
              name: 기본주소?.name,
              hp1: 기본주소?.hp1,
              hp2: 기본주소?.hp2,
              postcode: 기본주소?.postcode,
              addr1: 기본주소?.addr1,
              addr2: 기본주소?.addr2,
              addr3: 기본주소?.addr3,
              msg: undefined,
            },
          };
        });
      } else {
        품목리스트 = 품목리스트.map((x: 품목리스트항목타입) => {
          return {
            ...x,
            deliveryInfo: {
              name: undefined,
              hp1: undefined,
              hp2: undefined,
              postcode: undefined,
              addr1: undefined,
              addr2: undefined,
              addr3: undefined,
              msg: undefined,
            },
          };
        });
      }
    }
  }

  async function 가격계산(e: number | string | undefined, 품목: 품목리스트항목타입, 필드: string | undefined, 계산할브랜드: string | undefined = undefined) {
    const 품목정보 = 품목.productInfo;
    const 마진셋업 = 품목.default_margin;

    if (!계산할브랜드 && 필드) {
      const 가능한필드 = ["소비자가", "공급단가", "수량", "마진"];
      if (!가능한필드.includes(필드)) return;

      const 값 = String(e)
        .replace(/[^0-9.]/g, "")
        .replace(/(\..*)\./g, "$1");
      const 숫자값 = parseInt(String(값)) || 0;

      switch (필드) {
        case "소비자가":
          품목정보.sell_price = 숫자값;
          품목정보.dome_price = 계산_도매가(숫자값, Number(품목정보.margin));
          break;
        case "공급단가":
          품목정보.dome_price = Math.min(숫자값, 품목정보.sell_price ?? 0);
          품목정보.margin = 계산_마진(Number(품목정보.sell_price), 품목정보.dome_price) || 0;
          break;
        case "마진":
          품목정보.margin = Math.min(100, Math.max(0, 숫자값));
          품목정보.dome_price = 계산_도매가(Number(품목정보.sell_price), 품목정보.margin);
          break;
        case "수량":
          품목정보.qty = Math.floor(숫자값);

          const 할인공급가 = 숫자로변환(마진셋업?.per_user?.discount_price ?? 마진셋업?.discount_price);
          const 할인마진 = 숫자로변환(마진셋업?.per_user?.discount_margin ?? 마진셋업?.discount_margin);
          const 기본마진 = 숫자로변환(마진셋업?.per_user?.default_margin ?? 마진셋업?.default_margin);
          const 기본공급가 = 숫자로변환(마진셋업?.per_user?.default_prov ?? 마진셋업?.default_prov);

          const 할인조건 = 할인조건계산(품목);

          const 타겟마진 = 할인조건 ? 할인마진 : 기본마진;
          const 타겟공급가 = 할인조건 ? 할인공급가 : 기본공급가;

          품목정보.margin = 타겟마진;
          품목정보.dome_price = 타겟공급가;

          break;
      }
      품목정보.total_dome = Number(품목정보.dome_price) * Number(품목정보.qty);
    }

    if (품목.productInfo.itemType !== 3 && (마진셋업?.brand_disc_amount || 계산할브랜드))
      품목리스트.map(각품목 => {
        if (!(각품목.productInfo.brand == 계산할브랜드 || 각품목.productInfo.brand == 품목.productInfo.brand)) return;
        const 품목정보 = 각품목.productInfo;
        const 마진셋업 = 각품목.default_margin;
        const 할인공급가 = 숫자로변환(마진셋업?.per_user?.discount_price ?? 마진셋업?.discount_price);
        const 할인마진 = 숫자로변환(마진셋업?.per_user?.discount_margin ?? 마진셋업?.discount_margin);
        const 기본마진 = 숫자로변환(마진셋업?.per_user?.default_margin ?? 마진셋업?.default_margin);
        const 기본공급가 = 숫자로변환(마진셋업?.per_user?.default_prov ?? 마진셋업?.default_prov);

        const 할인조건 = 할인조건계산(각품목);

        const 타겟마진 = 할인조건 ? 할인마진 : 기본마진;
        const 타겟공급가 = 할인조건 ? 할인공급가 : 기본공급가;

        품목정보.margin = 타겟마진;
        품목정보.dome_price = 타겟공급가;
        품목정보.total_dome = Number(품목정보.dome_price) * Number(품목정보.qty);
      });
  }

  function 할인조건계산(품목: 품목리스트항목타입, 출력 = false) {
    const 할인수량 = 품목.default_margin?.per_user?.discount_qty ?? 품목.default_margin?.discount_qty;
    const 할인마진 = 품목.default_margin?.per_user?.discount_margin ?? 품목.default_margin?.discount_margin;
    const 브랜드할인가 = 품목.default_margin?.brand_disc_amount;

    if (브랜드할인가 && 숫자로변환(할인수량) === 0) {
      const 선적용동일브랜드품목합계 = 품목리스트.reduce((누계, 현품목) => (현품목.productInfo.brand == 품목.productInfo.brand ? 누계 + 숫자로변환(현품목.productInfo.qty) * 숫자로변환(현품목.default_margin?.per_user?.discount_price ?? 현품목.default_margin?.discount_price) : 누계), 0);
      const 실제동일브랜드품목합계 = 품목리스트.reduce((누계, 현품목) => (현품목.productInfo.brand == 품목.productInfo.brand ? 누계 + 숫자로변환(현품목.productInfo.total_dome) : 누계), 0);
      const 계산값 = Math.max(0, 숫자로변환(브랜드할인가) - 실제동일브랜드품목합계);
      const 선적용계산값 = Math.max(0, 숫자로변환(브랜드할인가) - 선적용동일브랜드품목합계);
      const 실제표시할값 = 선적용계산값 > 계산값 ? 선적용계산값 : 계산값;
      return 출력 ? `${로케일숫자로표시(실제표시할값)}원만 더 발주하면 ${할인마진 ?? 0}% 마진이 적용돼요.` : !실제표시할값;
    } else {
      const 계산값 = Math.max(0, 숫자로변환(할인수량) - 숫자로변환(품목.productInfo.qty));
      return 출력 ? `${계산값}개만 더 발주하면 ${할인마진 ?? 0}% 마진이 적용돼요.` : !계산값;
    }
  }

  function 데모반영(e: Event, 품목: 품목리스트항목타입) {
    const 값 = (e?.currentTarget as HTMLButtonElement)?.value;
    if (parseInt(값)) {
      품목.productInfo.margin = parseInt(String(값)) == 1 ? 40 : 50;
      품목.productInfo.qty = 1;
    } else {
      품목.productInfo.margin = 0;
      품목.productInfo.qty = 0;
    }
    가격계산(품목.productInfo.margin, 품목, "마진");
  }

  async function 수동입력활성화(품목: 품목리스트항목타입) {
    if (품목.productInfo.itemType !== 3) return;

    const 팝업 = await Swal.fire({
      icon: "question",
      title: "수동 입력을 활성화하시겠습니까?",
      html: "<p>현재 수량에 따른 공급 마진 및 마진 값이 <br />자동으로 입력되도록 설정되어 있습니다.</p><p>영업 담당자로부터 수동 입력을 확인 받으신 경우<br />수동으로 입력이 가능하며,<br />미확인 시 수동 입력하여도 계약된 마진으로<br />발주가 진행되는 점 참고 부탁드립니다.</p>",
      confirmButtonText: "예(수동 입력 활성화)",
      showCancelButton: true,
      cancelButtonText: "아니오(창닫기)",
    });

    if (!팝업.isConfirmed) 품목.productInfo.itemType = 0;
  }

  function 품목추가(
    옵션:
      | {
          복제?: boolean;
          데이터?: 품목리스트항목타입[];
        }
      | undefined = undefined
  ) {
    품목리스트 = [
      ...품목리스트,
      옵션 && 옵션.복제
        ? (() => {
            const 원본: 품목리스트항목타입 = 품목리스트[품목리스트.length - 1];
            const 사본: 품목리스트항목타입 = JSON.parse(JSON.stringify(원본));
            사본.uuid = crypto.randomUUID();
            return 사본;
          })()
        : {
            uuid: crypto.randomUUID(),
            collapsed: false,
            failed: false,
            productInfo: {
              itemType: 0,
              brand: undefined,
              product: undefined,
              PROD_CD: undefined,
              prop: undefined,
              useprop: false,
              sell_price: 0,
              dome_price: 0,
              qty: 0,
              margin: 0,
              total_dome: 0,
              soldout: false,
            },
            deliveryInfo: {
              name: undefined,
              hp1: undefined,
              hp2: undefined,
              addr1: undefined,
              addr2: undefined,
              addr3: undefined,
              postcode: undefined,
              msg: undefined,
            },
          },
    ];
    const 마지막품목 = 품목리스트.at(-1);
    if (마지막품목) 가격계산(undefined, 마지막품목, undefined, 마지막품목.productInfo.brand);
  }

  function 선택상자열기(e: Event, 품목: 품목리스트항목타입, 유형: string, 요소: HTMLElement, 인덱스: number) {
    요소.removeEventListener("input", 선택상자검색);
    요소.removeEventListener("keydown", 선택상자검색항목선택);
    선택상자호출자 = {
      요소,
      인덱스,
      품목,
      유형,
    };
    선택상자항목 = [];

    const 브랜드 = 품목.productInfo.brand;

    if (유형 == "브랜드") {
      선택상자항목 = Object.keys(전체품목).map(x => ({ brand: x, product: undefined, PROD_CD: undefined, software: undefined, soldout: undefined, bypass_soldout: undefined }));
    } else if (유형 == "품목명" && 브랜드) {
      const key = String(브랜드);
      const items = (전체품목 as 전체품목리스트)[key];
      if (Array.isArray(items)) {
        선택상자항목 = items.map((x: 개별품목정보): 임시배열타입 => {
          return { brand: x.brand, product: x.product, PROD_CD: x.PROD_CD, software: x.software, soldout: x.zerostock, stock_level: x.stock_level, bypass_soldout: parseInt(x.bypass_soldout ?? "0") };
        });
      } else {
        선택상자항목 = [];
      }
    } else {
      선택상자항목 = 검색상자전체품목 ? 검색상자전체품목 : [];
    }

    if (유형) {
      선택상자조정();
      선택상자열림 = true;
      선택상자선택항목 = 선택상자항목.findIndex(x => x.product == (요소 as HTMLInputElement).value || x.brand == (요소 as HTMLInputElement).value);
      요소.addEventListener("input", 선택상자검색);
      요소.addEventListener("keydown", 선택상자검색항목선택);
    }

    선택상자필터 = undefined;
    if (e) 선택상자검색(e);
  }

  function 선택상자검색항목선택(e: KeyboardEvent) {
    if (!(선택상자호출자.품목 && 선택상자호출자.요소)) return;

    function 검색후조치() {
      if (!(선택상자호출자.품목 && 선택상자호출자.요소)) return;

      if (선택상자선택항목 >= 0) {
        선택상자요소배열[선택상자선택항목].click();
      } else {
        선택상자호출자.품목.productInfo.sell_price = 0;
        선택상자호출자.품목.productInfo.PROD_CD = "etc_001";
        선택상자호출자.품목.default_margin = undefined;
        선택상자호출자.품목.productInfo.itemType = 3;
        선택상자열림 = false;
      }
    }

    switch (e.key) {
      case "Tab":
        검색후조치();
        break;
      case "Enter":
        e.preventDefault();
        검색후조치();
        선택상자호출자.요소.blur();
        break;
      case "ArrowUp":
        e.preventDefault();
        선택상자선택항목 = Math.max(-1, 선택상자선택항목 - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        선택상자선택항목 = Math.min((Array.isArray(선택상자필터) ? 선택상자필터.length : 선택상자항목.length) - 1, 선택상자선택항목 + 1);
        break;
    }
  }

  function 선택상자검색(e: Event) {
    if (!선택상자열림) 선택상자열림 = true;
    let 검색된항목;

    if (선택상자호출자.유형 == "브랜드") {
      선택상자필터 = 선택상자항목.filter((x: 임시배열타입) => {
        if (x.brand?.toLowerCase().includes((e.currentTarget as HTMLInputElement).value.toLowerCase())) return true;
      });
      검색된항목 = 선택상자필터.findIndex((x: 임시배열타입) => {
        return x.brand?.toLowerCase().includes((e.currentTarget as HTMLInputElement).value.toLowerCase());
      });
    } else if (선택상자호출자.유형 == "품목명") {
      선택상자필터 = 선택상자항목.filter((x: 임시배열타입) => {
        if (x.product?.toLowerCase().includes((e.currentTarget as HTMLInputElement).value.toLowerCase())) return true;
      });
      검색된항목 = 선택상자필터.findIndex((x: 임시배열타입) => {
        return x.product?.toLowerCase().includes((e.currentTarget as HTMLInputElement).value.toLowerCase());
      });
    } else {
      return;
    }

    if (!(e.currentTarget as HTMLInputElement).value) 선택상자필터 = undefined;

    선택상자선택항목 = 검색된항목;
    if (!(e.currentTarget as HTMLInputElement).value) {
      선택상자선택항목 = -1;
    }
  }

  function 선택상자조정() {
    requestAnimationFrame(() => {
      if (!(선택상자호출자.요소 && 컨테이너 && isHTMLElement(컨테이너))) return;

      const 호출자속성 = 선택상자호출자.요소.getBoundingClientRect();
      컨테이너.style.setProperty("--selectbox_top", String(호출자속성.bottom));
      컨테이너.style.setProperty("--selectbox_left", String(호출자속성.left));
      컨테이너.style.setProperty("--selectbox_width", String(Math.max(호출자속성.width, 200)));
    });
  }

  async function 유효성검사() {
    let 검사결과: number = 1;
    let 자세한내용 = "";
    if (!배송형태) {
      검사결과 = 0;
      자세한내용 = "배송형태가 선택되지 않았습니다.";
    } else if (!품목리스트.length) {
      검사결과 = 0;
      자세한내용 = "품목 리스트가 존재하지 않습니다.";
    } else {
      const 결과 = 품목리스트.reduce(
        (
          acc: {
            status: boolean;
            reason: string[][];
            warning: boolean;
            warning_reason: string[][];
          },
          cur: 품목리스트항목타입,
          index: number
        ) => {
          if (index == 0) cur.failed = false;
          const keys = Object.keys(cur) as (keyof 품목리스트항목타입)[];
          keys.forEach(item => {
            if (배송형태 && ["대리배송", "퀵착불", "익일수령택배"].includes(배송형태)) {
              if (item == "deliveryInfo") {
                const deliveryInfo = Object.keys(cur[item]) as (keyof 배송정보타입)[];
                deliveryInfo.forEach(deliveryInfoItem => {
                  const 값 = cur.deliveryInfo[deliveryInfoItem];
                  if (!값 && ["name", "hp1", "postcode", "addr1", "addr2"].includes(deliveryInfoItem)) {
                    acc.status = false;
                    if (!acc.reason[index]) acc.reason[index] = [];
                    acc.reason[index].push(deliveryInfoItem);
                    cur.failed = true;
                  }
                });
              }
            }

            if (item == "productInfo") {
              const productInfo = Object.keys(cur[item]) as (keyof 제품정보타입)[];
              productInfo.forEach(productInfoItem => {
                const 값 = cur.productInfo[productInfoItem];
                if (!값) {
                  if (["product", "PROD_CD", "qty"].includes(productInfoItem)) {
                    acc.status = false;
                    if (!acc.reason[index]) acc.reason[index] = [];
                    acc.reason[index].push(productInfoItem);
                    cur.failed = true;
                  }
                  const nullishDataCheck = (productInfoItem == "margin" && !cur.productInfo.dome_price) || (productInfoItem == "dome_price" && !cur.productInfo.margin);
                  if (nullishDataCheck) {
                    acc.warning = true;
                    if (!acc.warning_reason[index]) acc.warning_reason[index] = [];
                    acc.warning_reason[index].push(productInfoItem);
                  }
                }
              });
            }
          });
          return acc;
        },
        {
          status: true,
          reason: [],
          warning: false,
          warning_reason: [],
        }
      );
      if (결과.status == false) 검사결과 = 0;
      if (결과.status && 결과.warning) 검사결과 = 2;
    }

    if (검사결과 == 0) {
      자세한내용 = "필수 입력란이 누락되었습니다. 내용을 확인해주세요.";
    }
    if (검사결과 == 2) 자세한내용 = "일부 항목이 누락되었습니다. 누락되었어도 진행이 가능하나 담당자 임의로 처리될 수 있는 점 확인 부탁드립니다.";

    if (검사결과 == 0) {
      const 팝업 = Swal.fire({
        title: "입력란이 누락되어 있습니다.",
        text: 자세한내용,
        confirmButtonText: "확인",
      });
    }

    //@ts-ignore
    if (window.validateData) window.validateData(검사결과);
  }

  async function 엑셀파싱(e: Event) {
    if (!엑셀파일선택) return;
    const 파일 = 엑셀파일선택.files?.[0];
    let error;
    if (!파일) return;
    엑셀로딩 = true;

    try {
      엑셀데이터 = await parseExcelWithWorker(파일);
      console.log(엑셀데이터);
    } catch (err) {
      error = err as Error;
    } finally {
      if (error) console.trace(error);
      엑셀데이터선택창 = true;
    }
    엑셀파일선택.value = "";
  }

  onMount(async () => {
    try {
      const 품목가져오기 = await fetch("https://b2b.soundcat.com/page/get_products.php", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          key: "b2b_write",
        }),
      });

      if (!품목가져오기.ok) {
        throw new Error(`서버 응답 오류: ${품목가져오기.status}`);
      }

      전체품목 = await 품목가져오기.json();
    } catch (err) {
      console.error("품목 로딩 실패:", err);
      alert("오류가 발생하여 전체 품목 리스트를 가져오지 못했습니다. 품목을 수동으로 입력하여 작성이 가능합니다.");
    }

    let 배송형태셀렉터: HTMLSelectElement | null = document.querySelector("#ex_1");
    if (배송형태셀렉터) {
      const 초기값 = 배송형태셀렉터.value;

      if (배송형태종류.includes(초기값 as any)) {
        배송형태 = 초기값 as 배송형태종류타입;
      }
      배송형태셀렉터.addEventListener("change", 배송형태변경);
    }

    let 발주서셀렉터: HTMLSelectElement | null = document.querySelector("#ca_name");
    if (발주서셀렉터) {
      발주서셀렉터.addEventListener("change", () => {
        //@ts-ignore
        if (window.getOrderType) 발주서상태 = window.getOrderType();
      });
    }

    //@ts-ignore
    if (window.getExistingData)
      품목리스트 = [
        ...품목리스트,
        //@ts-ignore
        ...window.getExistingData().map(x => ({
          ...x,
          default_margin: 전체품목?.[x.productInfo.brand]?.find(y => y.PROD_CD == x.productInfo.PROD_CD)?.default_margin,
        })),
      ];

    if (품목리스트.length === 0) {
      품목추가();
    }

    //@ts-ignore
    if (window.getDefaultAddr) 기본주소 = window.getDefaultAddr();
    //@ts-ignore
    if (window.getOrderType) 발주서상태 = window.getOrderType();

    window.addEventListener("formValidation", 유효성검사);
    window.addEventListener("autosaveload", e => {
      //@ts-ignore
      const json = e.detail.json;
      try {
        const parsed = JSON.parse(json);
        품목리스트 = [...parsed];
      } catch (err) {
        console.error(err);
      }
    });
  });

  onDestroy(() => {
    let 배송형태셀렉터: HTMLSelectElement | null = document.querySelector("#ex_1");
    if (배송형태셀렉터) {
      배송형태셀렉터.removeEventListener("change", 배송형태변경);
    }
  });

  $effect(() => {
    if (선택상자선택항목 >= 0) {
      선택상자요소배열[선택상자선택항목]?.scrollIntoView({ block: "nearest" });
    } else {
      직접입력선택상자?.scrollIntoView({ block: "nearest" });
    }
  });
  $effect(() => {
    //@ts-ignore
    if (품목리스트 && window.setData)
      //@ts-ignore
      window.setData(
        품목리스트.map(x => {
          const 반환할값 = structuredClone($state.snapshot(x));
          delete 반환할값.default_margin;
          return 반환할값;
        })
      );
  });
</script>

<div
  class="app_container"
  bind:this={컨테이너}>
  <div
    class="prod_list"
    class:excelLoading={엑셀로딩}>
    {#each 품목리스트 as 품목, 인덱스 (품목.uuid)}
      <div
        class="prod_item"
        {@attach node => {
          node.scrollIntoView({ block: "nearest" });
        }}
        transition:fly={{ y: -10, duration: 100 }}>
        <div class="app_header">
          <button
            type="button"
            class="arcodian"
            onclick={() => (품목.collapsed = !품목.collapsed)}
            aria-label="품목 접기/펼치기"
            title="품목 접기/펼치기">{@html 품목.collapsed ? `<i class="fas fa-chevron-right"></i>` : `<i class="fas fa-chevron-down"></i>`}</button>
          <span class="item_title"><strong>품목{인덱스 + 1}</strong></span><span class="hori_div"></span>
          <div class="radio_vertical">
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType1"
                name="itemType_{인덱스}"
                onchange={e => {
                  데모반영(e, 품목);
                }}
                value={0}
                bind:group={품목.productInfo.itemType} />
              <span>일반</span>
            </label>
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType2"
                name="itemType_{인덱스}"
                onchange={e => {
                  데모반영(e, 품목);
                }}
                value={1}
                bind:group={품목.productInfo.itemType} />
              <span>데모(40%)</span>
            </label>
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType3"
                name="itemType_{인덱스}"
                onchange={e => {
                  데모반영(e, 품목);
                }}
                value={2}
                bind:group={품목.productInfo.itemType} />
              <span>데모(50%)</span>
            </label>
            <label class="app_radio">
              <input
                type="radio"
                id="id_{인덱스}_itemType4"
                name="itemType_{인덱스}"
                onchange={() => 수동입력활성화(품목)}
                value={3}
                bind:group={품목.productInfo.itemType} />
              <span>특별건</span>
            </label>
          </div>
          <div class="action">
            {#if 품목리스트.length > 1}
              <button
                type="button"
                onclick={() => {
                  const 삭제전품목 = structuredClone($state.snapshot(품목));
                  품목리스트.splice(인덱스, 1);
                  if (삭제전품목.default_margin?.brand_disc_amount) 가격계산(undefined, 삭제전품목, undefined, 삭제전품목.productInfo.brand);
                }}>삭제</button>
            {/if}
          </div>
        </div>
        {#if !품목.collapsed}
          <div
            class="app_body"
            transition:fly={{ y: -10, duration: 100 }}>
            {#if 배송형태 && ["대리배송", "익일수령택배", "퀵착불"].includes(배송형태)}
              <Postinfo
                {인덱스}
                bind:품목={품목리스트[인덱스]}
                bind:우편번호검색열림
                bind:우편번호검색상자
                bind:우편번호상세입력란></Postinfo>
            {/if}
            <div class="prodInfo app_row">
              <div
                class="app_col"
                style="--flex-basis: 20%;">
                <div>
                  <label
                    for="id_{인덱스}_brand"
                    class="app_label block">브랜드</label>
                </div>
                <input
                  type="text"
                  placeholder="브랜드"
                  id="id_{인덱스}_brand"
                  bind:value={
                    () => 품목.productInfo.brand,
                    v => {
                      const 기존브랜드 = 품목.productInfo.brand;
                      const 기존브랜드할인가 = 품목.default_margin?.brand_disc_amount;
                      품목.productInfo.brand = v;
                      내용리셋(품목);
                      if (기존브랜드 != v && 기존브랜드할인가) 가격계산(undefined, 품목, undefined, 기존브랜드);
                    }
                  }
                  onfocus={e => 선택상자열기(e, 품목, "브랜드", e.currentTarget, 인덱스)}
                  onblur={e => {
                    e.currentTarget.removeEventListener("input", 선택상자검색);
                    e.currentTarget.removeEventListener("keydown", 선택상자검색항목선택);
                  }} />
              </div>
              <div
                class="app_col"
                style="--flex-basis: {품목.productInfo.useprop || 품목.productInfo.PROD_CD == 'etc_001' ? '40' : '80'}%;">
                <div>
                  <label
                    for="id_{인덱스}_product"
                    class="app_label block">품목명 <span style="font-weight:normal; font-size: 0.9em">(찾는 품목이 없는 경우 직접 입력하여 진행 가능)</span></label>
                </div>
                <input
                  type="text"
                  placeholder="브랜드를 선택하지 않아도 품목 선택 가능"
                  id="id_{인덱스}_product"
                  class={[품목.productInfo.PROD_CD == "etc_001" && "editable", 품목.failed && !품목.productInfo.product && "failed"]}
                  bind:this={품목명입력란[품목.uuid]}
                  bind:value={
                    () => 품목.productInfo.product,
                    v => {
                      품목.productInfo.product = v;
                      내용리셋(품목, true);
                    }
                  }
                  onfocus={e => 선택상자열기(e, 품목, "품목명", e.currentTarget, 인덱스)}
                  onblur={e => {
                    e.currentTarget.removeEventListener("input", 선택상자검색);
                    e.currentTarget.removeEventListener("keydown", 선택상자검색항목선택);
                  }} />
              </div>
              {#if 품목.productInfo.useprop || 품목.productInfo.PROD_CD == "etc_001"}
                <div
                  class="app_col"
                  style="--flex-basis: 40%;">
                  <div>
                    <label
                      for="id_{인덱스}_prop"
                      class="app_label block">옵션</label>
                  </div>
                  <input
                    type="text"
                    id="id_{인덱스}_prop"
                    class:failed={품목.failed && 품목.productInfo.useprop && !품목.productInfo.prop}
                    bind:value={품목.productInfo.prop} />
                </div>
              {/if}
              <div
                class="app_col"
                style="--flex-basis: 20%;">
                <div>
                  <label
                    for="id_{인덱스}_sell_price"
                    class="app_label block">소비자가</label>
                </div>
                <div
                  class="app_text_input"
                  data-label="원">
                  <input
                    type="text"
                    id="id_{인덱스}_sell_price"
                    class={[품목.productInfo.PROD_CD == "etc_001" && "editable"]}
                    style="cursor: {품목.productInfo.PROD_CD !== 'etc_001' ? 'not-allowed' : 'normal'}"
                    bind:value={() => new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.sell_price)), e => 가격계산(e, 품목, "소비자가")}
                    readonly={품목.productInfo.PROD_CD !== "etc_001" || 품목.productInfo.itemType !== 3} />
                </div>
              </div>
              <div
                class="app_col"
                style="--flex-basis: 20%;">
                <div>
                  <label
                    for="id_{인덱스}_dome_price"
                    class="app_label block">공급단가</label>
                </div>
                <div
                  class="app_text_input"
                  data-label="원">
                  <input
                    type="text"
                    id="id_{인덱스}_dome_price"
                    class={[품목.productInfo.itemType === 3 && "editable"]}
                    style="cursor: {품목.productInfo.itemType !== 3 ? 'not-allowed' : 'normal'}"
                    bind:value={() => new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.dome_price)), e => 가격계산(e, 품목, "공급단가")}
                    readonly={품목.productInfo.itemType !== 3 ? true : false} />
                </div>
              </div>
              <div
                class="app_col"
                style="--flex-basis: 10%;">
                <div>
                  <label
                    for="id_{인덱스}_qty"
                    class="app_label block">수량</label>
                </div>
                <div
                  class={["app_text_input", 품목.default_margin && !품목.productInfo.itemType && !할인조건계산(품목) && "qty"]}
                  data-label="개"
                  data-discqty={할인조건계산(품목, true)}>
                  <input
                    type="text"
                    class={["app_text_input", 품목.productInfo.itemType === 3 && "editable"]}
                    data-label="개"
                    class:failed={품목.failed && !품목.productInfo.qty}
                    readonly={품목.productInfo.itemType === 1 || 품목.productInfo.itemType === 2 ? true : false}
                    style="cursor: {품목.productInfo.itemType === 1 || 품목.productInfo.itemType === 2 ? 'not-allowed' : 'normal'}"
                    id="id_{인덱스}_qty"
                    bind:value={() => new Intl.NumberFormat("ko-KR").format(Math.floor(Number(품목.productInfo.qty))), e => 가격계산(e, 품목, "수량")} />
                </div>
              </div>
              <div
                class="app_col"
                style="--flex-basis: 10%;">
                <div>
                  <label
                    for="id_{인덱스}_margin"
                    class="app_label block">마진(%)</label>
                </div>
                <input
                  type="text"
                  id="id_{인덱스}_margin"
                  class={[품목.productInfo.itemType === 3 && "editable"]}
                  style="cursor: {품목.productInfo.itemType !== 3 ? 'not-allowed' : 'normal'}"
                  bind:value={() => new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.margin)), e => 가격계산(e, 품목, "마진")}
                  readonly={품목.productInfo.itemType !== 3 ? true : false} />
              </div>
              <div
                class="app_col"
                style="--flex-basis: 40%;">
                <div>
                  <label
                    for="id_{인덱스}_total_dome"
                    class="app_label block">공급합계</label>
                </div>
                <div
                  class="app_text_input"
                  data-label="원">
                  <input
                    type="text"
                    id="id_{인덱스}_total_dome"
                    style="cursor: not-allowed"
                    value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.total_dome))}
                    readonly />
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  <div class="app_footer app_row">
    <button
      type="button"
      onclick={() => 품목추가({ 복제: true })}>추가</button>
    <div
      class="app_col"
      style="display: flex; align-items:center; justify-content: flex-end;">
      <div style="margin: 0; padding: 0.5em 0.5em calc(0.5em - 1px); border: 1px solid #ddd; border-right: none; box-sizing: border-box; background: #eee; border-radius: 4px 0 0 4px">총합계</div>
      <div
        class="app_text_input"
        data-label="원">
        <input
          style="margin: 0; width: unset; border: 1px solid #ddd; border-radius: 0 4px 4px 0"
          type="text"
          readonly
          value={new Intl.NumberFormat("ko-KR").format(
            품목리스트.reduce((val, x) => {
              return val + (x.productInfo.total_dome ?? 0);
            }, 0)
          )} />
      </div>
    </div>
    <div style="text-align: right">
      <button
        type="button"
        onclick={() => 엑셀파일선택?.click()}>엑셀자료 불러오기</button
      ><input
        hidden
        type="file"
        accept=".xlsx,.xls"
        bind:this={엑셀파일선택}
        onchange={엑셀파싱} />
    </div>
  </div>
  {#if 선택상자열림}
    <Selectbox
      bind:선택상자
      bind:선택상자열림
      bind:직접입력선택상자
      bind:선택상자요소배열
      bind:선택상자호출자
      bind:품절팝업열림
      bind:발주서상태
      {선택상자선택항목}
      {선택상자필터}
      {선택상자항목}
      {전체품목}
      {선택상자조정}
      {isHTMLElement}
      {품목명입력란}
      {배송형태}
      {전자배송팝업내용}
      {전자배송팝업열림}
      {가격계산} />
  {/if}
</div>
{#if 엑셀데이터선택창 && 엑셀데이터.length}
  <ExcelImport
    bind:엑셀데이터
    bind:엑셀데이터선택창
    bind:품목리스트
    bind:엑셀로딩 />
{/if}
{#if 품절팝업열림}
  <Portal target=".soldoutDialog .swal2-html-container">
    <div bind:this={품절팝업내용}>
      <p>해당 제품은 현재 [품절]입니다.</p>
      <br />
      <p>품절된 품목이 있어도 발주서 작성은 가능하지만<br /><strong>출고가 불가능</strong>한 점 참고 바랍니다.</p>
      <p>
        <strong style="color:red"
          >(재고 부족으로 인해 출고가 불가능한 경우<br />
          <u>별도 안내 없이 [취소]처리</u>됩니다.)</strong>
      </p>
      <br />
      <p>재고 입고 일정 등 확인이 필요하실 경우<br />영업 담당자에게 문의 주시기 바랍니다.</p>
      <br />
      <p style="color: red">담당자 확인 후 발주 진행하시는 경우에는 무관하며,<br /><strong>다른 품목을 선택하여 혼동이 발생하지 않도록 주의 바랍니다.<br /></strong></p>
      <br />
      <p>선오더로 발주하려면 <strong>'선오더로 변경'</strong>을 선택하세요.</p>
    </div>
  </Portal>
{/if}
{#if 전자배송팝업열림}
  <Portal target=".esd-popup .swal2-html-container">
    <div>
      <p>해당 제품은 소프트웨어입니다.</p>
      <p>소프트웨어 발주 시 카테고리는 전자배송으로 자동 설정됩니다.</p>
      <br />
      <p>전자배송 받으실 이메일 주소를 입력하세요.</p>
      <p>(여러 주소로 받으실 경우 줄 단위로 구분해주세요.)</p>
      <br />
      <textarea
        bind:this={전자배송팝업내용}
        class="wizard-3-textarea"
        placeholder="여기에 수신 받을 이메일 주소를 입력해주세요."
        style="width:100%; height: 200px; font-size: 15px; padding: 10px; line-height: 1.2"></textarea>
    </div>
  </Portal>
{/if}

<style>
  @import "./app.css";
</style>
