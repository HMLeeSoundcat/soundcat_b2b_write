<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { parseExcelWithWorker } from "./lib/parseExcel";
  import type Swal from "sweetalert2";

  type 배송형태종류타입 = (typeof 배송형태종류)[number];

  type 품목리스트항목타입 = {
    uuid: string;
    productInfo: 제품정보타입;
    deliveryInfo: 배송정보타입;
    collapsed: boolean;
  };

  type 제품정보타입 = {
    itemType: 0 | 1 | 2;
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
  };

  type 배송정보타입 = {
    name: string | undefined;
    hp1: number | undefined;
    hp2: number | undefined;
    addr1: string | undefined;
    addr2: string | undefined;
    addr3: string | undefined;
    postcode: number | undefined;
    msg: string | undefined;
  };

  type 전체품목리스트 = {
    [key: string]: 개별품목정보[];
  };

  type 개별품목정보 = {
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
  };

  type 임시배열타입 = {
    product: string | undefined;
    brand: string | undefined;
    soldout: number | undefined;
  };

  type 선택상자호출자타입 = {
    요소: HTMLElement | undefined;
    인덱스: number;
    품목: 품목리스트항목타입 | undefined;
    유형: string | null | undefined;
  };

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
  let 선택상자선택항목: number = $state(-1);

  let 우편번호검색열림: Record<string, boolean> = $state({});
  let 우편번호검색상자: Record<string, HTMLElement> = $state({});
  let 우편번호검색호출인덱스 = $state(-1);
  let 우편번호상세입력란: Record<string, HTMLElement> = $state({});

  let 엑셀파일선택: HTMLInputElement | undefined = $state();
  let 엑셀로딩: boolean = $state(false);
  let 엑셀데이터: any[] = $state([]);
  let 엑셀데이터선택창: boolean = $state(false);
  let 엑셀제목줄 = $state(-1);
  let 엑셀양식 = $state([]);
  $inspect(엑셀양식);

  let 품목명입력란: Record<string, HTMLElement> = $state({});

  let 컨테이너 = $state();

  let 전체품목: 전체품목리스트 = $state({} as 전체품목리스트);

  const 배송형태종류 = ["익일수령택배", "방문수령", "퀵착불", "퀵선불", "대리배송", "전자배송", ""] as const;
  let 배송형태: 배송형태종류타입 | undefined = $state();

  let 품목리스트: 품목리스트항목타입[] = $state([]);
  $inspect(전체품목);

  function 배송형태변경(e: Event) {
    const 값 = (e.target as HTMLSelectElement).value;
    if (배송형태종류.includes(값 as any)) {
      배송형태 = 값 as 배송형태종류타입;
    }
  }

  async function 가격계산(e: Event, 품목: 품목리스트항목타입, 필드: string) {
    const 가능한필드 = ["소비자가", "공급단가", "수량", "마진"];
    if (!가능한필드.includes(필드)) return;

    const 요소 = e.currentTarget as HTMLInputElement;
    const 값 = 요소.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    요소.value = 값;
    const 숫자값 = Number(값) || 0;

    const 인덱스 = 품목리스트.findIndex(요소 => 요소.uuid == 품목.uuid);

    if (인덱스 == -1) return;

    function 계산_도매가(sell: number, margin: number) {
      return (sell * (100 - margin)) / 100;
    }

    function 계산_마진(sell: number, dome: number) {
      return 100 - (dome / sell) * 100;
    }

    switch (필드) {
      case "소비자가":
        품목리스트[인덱스].productInfo.sell_price = 숫자값;
        품목리스트[인덱스].productInfo.dome_price = 계산_도매가(숫자값, Number(품목리스트[인덱스].productInfo.margin));
        break;
      case "공급단가":
        품목리스트[인덱스].productInfo.dome_price = 숫자값;
        품목리스트[인덱스].productInfo.margin = 계산_마진(숫자값, Number(품목리스트[인덱스].productInfo.sell_price));
        break;
      case "마진":
        품목리스트[인덱스].productInfo.margin = 숫자값;
        품목리스트[인덱스].productInfo.dome_price = 계산_도매가(Number(품목리스트[인덱스].productInfo.sell_price), 숫자값);
        break;
      case "수량":
        요소.value = 요소.value.replace(/[^0-9]/g, "");
        품목리스트[인덱스].productInfo.qty = Math.floor(숫자값);
    }
    품목리스트[인덱스].productInfo.total_dome = Number(품목리스트[인덱스].productInfo.dome_price) * Number(품목리스트[인덱스].productInfo.qty);
  }

  const isHTMLElement = (element: any) => element instanceof HTMLElement || element instanceof HTMLInputElement;

  function 선택상자열기(품목: 품목리스트항목타입, 유형: string, 요소: HTMLElement, 인덱스: number, 브랜드: string | undefined = undefined) {
    window.removeEventListener("click", 선택상자닫기);
    요소.removeEventListener("input", 선택상자검색);
    요소.removeEventListener("keydown", 선택상자검색항목선택);
    선택상자호출자 = {
      요소,
      인덱스,
      품목,
      유형,
    };
    선택상자항목.length = 0;
    if (유형 == "브랜드") {
      선택상자항목 = Object.keys(전체품목).map(x => ({ brand: x, product: undefined, soldout: undefined }));
    } else if (유형 == "품목명" && 브랜드) {
      const key = String(브랜드);
      const items = (전체품목 as 전체품목리스트)[key];
      if (Array.isArray(items)) {
        선택상자항목 = items.map((x: 개별품목정보): 임시배열타입 => {
          return { brand: x.brand, product: x.product ?? "", soldout: x.zerostock };
        });
      } else {
        선택상자항목 = [];
      }
    } else {
      let 임시배열: any[] = [];
      Object.keys(전체품목).forEach(각브랜드 => {
        const items = 전체품목[각브랜드];
        if (Array.isArray(items)) {
          임시배열 = [
            ...임시배열,
            ...items.map((x: 개별품목정보) => {
              return { brand: x.brand, product: x.product ?? "", soldout: x.zerostock };
            }),
          ];
          선택상자항목 = 임시배열;
        }
      });
    }

    if (유형) {
      선택상자조정();
      선택상자열림 = true;
      선택상자선택항목 = 선택상자항목.findIndex(x => x.product == (요소 as HTMLInputElement).value || x.brand == (요소 as HTMLInputElement).value);
      window.addEventListener("click", 선택상자닫기);
      요소.addEventListener("input", 선택상자검색);
      요소.addEventListener("keydown", 선택상자검색항목선택);
    }
  }

  function 선택상자검색항목선택(e: KeyboardEvent) {
    if (e.key == "Enter") {
      e.preventDefault();
      if (!(선택상자호출자.품목 && 선택상자호출자.요소)) return;
      if (선택상자선택항목 >= 0) {
        선택상자요소배열[선택상자선택항목].click();
      } else {
        선택상자호출자.품목.productInfo.sell_price = 0;
        선택상자호출자.품목.productInfo.PROD_CD = "etc_001";
        선택상자열림 = false;
      }
      선택상자호출자.요소.blur();
    }
  }

  function 선택상자검색(e: Event) {
    const 검색된항목 = 선택상자항목.findIndex((x: 임시배열타입) => {
      if (선택상자호출자.품목) {
        return x.brand?.toLowerCase().includes((e.currentTarget as HTMLInputElement).value.toLowerCase());
      } else {
        return x.product?.toLowerCase().includes((e.currentTarget as HTMLInputElement).value.toLowerCase());
      }
    });
    선택상자선택항목 = 검색된항목;
  }

  function 선택상자닫기(e: Event) {
    if (!((isHTMLElement(e.target) && isHTMLElement(선택상자) && 선택상자.contains(e.target)) || (isHTMLElement(선택상자호출자.요소) && isHTMLElement(e.target) && 선택상자호출자.요소.contains(e.target)))) {
      선택상자열림 = false;
      window.removeEventListener("click", 선택상자닫기);
    }
  }

  function 선택상자조정() {
    if (!(선택상자호출자.요소 && 컨테이너 && isHTMLElement(컨테이너))) return;
    const 호출자속성 = 선택상자호출자.요소.getBoundingClientRect();
    컨테이너.style.setProperty("--selectbox_top", String(호출자속성.bottom));
    컨테이너.style.setProperty("--selectbox_left", String(호출자속성.left));
    컨테이너.style.setProperty("--selectbox_width", String(Math.max(호출자속성.width, 200)));
  }

  function 품목추가(복제: boolean = false) {
    품목리스트 = [
      ...품목리스트,
      복제
        ? (() => {
            const 원본: 품목리스트항목타입 = 품목리스트[품목리스트.length - 1];
            const 사본: 품목리스트항목타입 = JSON.parse(JSON.stringify(원본));
            사본.uuid = crypto.randomUUID();
            return 사본;
          })()
        : {
            uuid: crypto.randomUUID(),
            collapsed: false,
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
  }

  async function 우편번호검색(품목: 품목리스트항목타입) {
    우편번호검색열림[품목.uuid] = true;
    await tick();

    //@ts-ignore
    new daum.Postcode({
      oncomplete: (data: any) => {
        let addr = "";
        let extraAddr = "";

        if (data.userSelectedType === "R") {
          addr = data.roadAddress;

          if (data.bname !== "" && /[동|로|가]$/g.test(data.bname)) {
            extraAddr += data.bname;
          }
          if (data.buildingName !== "" && data.apartment === "Y") {
            extraAddr += extraAddr !== "" ? ", " + data.buildingName : data.buildingName;
          }

          if (extraAddr !== "") {
            extraAddr = " (" + extraAddr + ")";
          }

          품목.deliveryInfo.addr3 = extraAddr;
        } else {
          addr = data.jibunAddress;
          품목.deliveryInfo.addr3 = "";
        }

        품목.deliveryInfo.postcode = data.zonecode;
        품목.deliveryInfo.addr1 = addr;

        우편번호검색열림[품목.uuid] = false;
        우편번호상세입력란[품목.uuid].focus();
      },
      onresize: (size: any) => {
        if (!우편번호검색상자[품목.uuid]) return;
        우편번호검색상자[품목.uuid].style.height = size.height + "px";
      },
      width: "100%",
      height: "100%",
      maxSuggestItems: 5,
    }).embed(우편번호검색상자[품목.uuid]);
  }

  async function 엑셀파싱(e: Event) {
    if (!엑셀파일선택) return;
    const 파일 = 엑셀파일선택.files?.[0];
    let error;
    if (!파일) return;

    엑셀로딩 = true;

    try {
      엑셀데이터 = await parseExcelWithWorker(파일);
    } catch (err) {
      error = (err as Error).message;
    } finally {
      if (error) console.trace(error);
      엑셀데이터선택창 = true;
    }
    엑셀파일선택.value = "";
  }

  function 엑셀자료입력(추가: boolean = false) {
    const 고객명 = 엑셀양식[0];
    const 전화번호1 = 엑셀양식[1];
    const 전화번호2 = 엑셀양식[2];
    const 우편번호 = 엑셀양식[3];
    const 배송메시지 = 엑셀양식[4];
    const 기본주소 = 엑셀양식[5];
    const 상세주소 = 엑셀양식[6];
    const 참고항목 = 엑셀양식[7];
    const 품목명 = 엑셀양식[8];

    const 추가될품목리스트: 품목리스트항목타입[] = 엑셀데이터.slice(엑셀제목줄 + 1).map((줄): 품목리스트항목타입 => {
      return {
        uuid: crypto.randomUUID(),
        collapsed: false,
        productInfo: {
          product: 줄[품목명],
          PROD_CD: "etc_001",
          brand: "",
          sell_price: 0,
          dome_price: 0,
          qty: 0,
          margin: 0,
          total_dome: 0,
          prop: "",
          useprop: false,
          itemType: 0,
          soldout: false,
        },
        deliveryInfo: {
          name: 줄[고객명],
          hp1: 줄[전화번호1],
          hp2: 줄[전화번호2],
          postcode: 줄[우편번호],
          msg: 줄[배송메시지],
          addr1: 줄[기본주소],
          addr2: 줄[상세주소],
          addr3: 줄[참고항목],
        },
      };
    });

    if (추가) {
      품목리스트 = [...품목리스트, ...추가될품목리스트];
    } else {
      품목리스트 = [...추가될품목리스트];
    }

    엑셀양식 = [];
    엑셀제목줄 = -1;
    엑셀데이터 = [];
    엑셀데이터선택창 = false;
    엑셀로딩 = false;
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
    const 초기값 = (배송형태셀렉터 as HTMLSelectElement).value;

    if (배송형태종류.includes(초기값 as any)) {
      배송형태 = 초기값 as 배송형태종류타입;
    }
    if (배송형태셀렉터) {
      배송형태셀렉터.addEventListener("change", 배송형태변경);
    }

    if (품목리스트.length === 0) {
      품목추가();
    }
  });

  onDestroy(() => {
    let 배송형태셀렉터: HTMLSelectElement | null = document.querySelector("#ex_1");
    if (배송형태셀렉터) {
      배송형태셀렉터.removeEventListener("change", 배송형태변경);
    }
  });

  $effect(() => {
    if (선택상자선택항목 >= 0) 선택상자요소배열[선택상자선택항목]?.scrollIntoView({ block: "end" });
  });
  $effect(() => {
    //@ts-ignore
    if (품목리스트) window.setData(품목리스트);
  });
</script>

<svelte:window onresize={선택상자조정} onscroll={선택상자조정} />
<div class="app_container" bind:this={컨테이너}>
  <div class="prod_list" class:excelLoading={엑셀로딩}>
    {#each 품목리스트 as 품목, 인덱스 (품목.uuid)}
      <div
        class="prod_item"
        {@attach node => {
          node.scrollIntoView({ block: "nearest" });
        }}
        transition:fly={{ y: -10, duration: 100 }}>
        <div class="app_header">
          <button type="button" class="arcodian" onclick={() => (품목.collapsed = !품목.collapsed)}>{품목.collapsed ? "►" : "▼"}</button>
          <span><strong>품목{인덱스 + 1}</strong></span>
          <div class="radio_vertical">
            <label class="app_radio">
              <input type="radio" id="id_{인덱스}_itemType1" name="itemType_{인덱스}" value={0} bind:group={품목.productInfo.itemType} />
              <span>일반</span>
            </label>
            <label class="app_radio">
              <input type="radio" id="id_{인덱스}_itemType2" name="itemType_{인덱스}" value={1} bind:group={품목.productInfo.itemType} />
              <span>데모(40%)</span>
            </label>
            <label class="app_radio">
              <input type="radio" id="id_{인덱스}_itemType3" name="itemType_{인덱스}" value={2} bind:group={품목.productInfo.itemType} />
              <span>데모(50%)</span>
            </label>
          </div>
          <div class="action">
            {#if 품목리스트.length > 1}
              <button type="button" onclick={() => 품목리스트.splice(인덱스, 1)}>삭제</button>
            {/if}
          </div>
        </div>
        {#if !품목.collapsed}
          <div class="app_body" transition:fly={{ y: -10, duration: 100 }}>
            {#if 배송형태 && ["대리배송", "익일수령택배", "퀵착불"].includes(배송형태)}
              <div class="deliveryInfo app_row">
                <div class="app_col" style="--flex-basis: 33%;">
                  <div><label for="id_{인덱스}_name" class="app_label block">고객명</label></div>
                  <input type="text" id="id_{인덱스}_name" bind:value={품목.deliveryInfo.name} />
                </div>
                <div class="app_col" style="--flex-basis: 33%;">
                  <div><label for="id_{인덱스}_hp1" class="app_label block">전화번호1</label></div>
                  <input type="text" id="id_{인덱스}_hp1" bind:value={품목.deliveryInfo.hp1} />
                </div>
                <div class="app_col" style="--flex-basis: 33%;">
                  <div><label for="id_{인덱스}_hp2" class="app_label block">전화번호2</label></div>
                  <input type="text" id="id_{인덱스}_hp2" bind:value={품목.deliveryInfo.hp2} />
                </div>
                <div class="app_col" style="--flex-basis: 100%;"><div class="app_label block"><span style="margin-right: 0.5em">주소</span><button type="button" onclick={e => 우편번호검색(품목)}>주소 검색</button></div></div>
                {#if 우편번호검색열림[품목.uuid]}
                  <div class="postcodebox app_col" style="--flex-basis: 100%" transition:fly={{ y: -10, duration: 100 }}>
                    <div class="app_header">
                      우편번호검색
                      <button
                        type="button"
                        onclick={() => {
                          우편번호검색열림[품목.uuid] = false;
                        }}>닫기</button>
                    </div>
                    <div class="app_body" bind:this={우편번호검색상자[품목.uuid]}></div>
                  </div>
                {/if}
                <div class="app_col" style="--flex-basis: 50%">
                  <input type="text" placeholder="우편번호" bind:value={품목.deliveryInfo.postcode} />
                </div>
                <div class="app_col" style="--flex-basis: 50%">
                  <input type="text" placeholder="배송메시지" bind:value={품목.deliveryInfo.msg} />
                </div>
                <div class="app_col" style="--flex-basis: 100%">
                  <input type="text" placeholder="기본주소" bind:value={품목.deliveryInfo.addr1} />
                </div>
                <div class="app_col" style="--flex-basis: 50%">
                  <input bind:this={우편번호상세입력란[품목.uuid]} type="text" placeholder="상세주소" bind:value={품목.deliveryInfo.addr2} />
                </div>
                <div class="app_col" style="--flex-basis: 50%">
                  <input type="text" placeholder="참고항목" bind:value={품목.deliveryInfo.addr3} />
                </div>
              </div>
              <hr />
            {/if}
            <div class="prodInfo app_row">
              <div class="app_col" style="--flex-basis: 20%;">
                <div><label for="id_{인덱스}_brand" class="app_label block">브랜드</label></div>
                <input
                  type="text"
                  placeholder="브랜드"
                  id="id_{인덱스}_brand"
                  bind:value={품목.productInfo.brand}
                  onfocus={e => 선택상자열기(품목, "브랜드", e.currentTarget, 인덱스)}
                  onblur={e => {
                    e.currentTarget.removeEventListener("input", 선택상자검색);
                    e.currentTarget.removeEventListener("keydown", 선택상자검색항목선택);
                  }} />
              </div>
              <div class="app_col" style="--flex-basis: {품목.productInfo.useprop || 품목.productInfo.PROD_CD == 'etc_001' ? '40' : '80'}%;">
                <div><label for="id_{인덱스}_product" class="app_label block">품목명 <span style="font-weight:normal; font-size: 0.9em">(찾는 품목이 없는 경우 선택 없이 진행 가능)</span></label></div>
                <input
                  type="text"
                  placeholder="브랜드를 선택하지 않아도 품목 선택 가능"
                  id="id_{인덱스}_product"
                  bind:this={품목명입력란[품목.uuid]}
                  bind:value={품목.productInfo.product}
                  onfocus={e => 선택상자열기(품목, "품목명", e.currentTarget, 인덱스, 품목.productInfo.brand)}
                  onblur={e => {
                    e.currentTarget.removeEventListener("input", 선택상자검색);
                    e.currentTarget.removeEventListener("keydown", 선택상자검색항목선택);
                  }} />
              </div>
              {#if 품목.productInfo.useprop || 품목.productInfo.PROD_CD == "etc_001"}
                <div class="app_col" style="--flex-basis: 40%;">
                  <div><label for="id_{인덱스}_prop" class="app_label block">옵션</label></div>
                  <input type="text" id="id_{인덱스}_prop" bind:value={품목.productInfo.prop} />
                </div>
              {/if}
              <div class="app_col" style="--flex-basis: 20%;">
                <div><label for="id_{인덱스}_sell_price" class="app_label block">소비자가</label></div>
                <input type="text" id="id_{인덱스}_sell_price" value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.sell_price))} readonly />
              </div>
              <div class="app_col" style="--flex-basis: 20%;">
                <div><label for="id_{인덱스}_dome_price" class="app_label block">공급단가</label></div>
                <input
                  type="text"
                  id="id_{인덱스}_dome_price"
                  value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.dome_price))}
                  oninput={e => {
                    가격계산(e, 품목, "공급단가");
                  }} />
              </div>
              <div class="app_col" style="--flex-basis: 10%;">
                <div><label for="id_{인덱스}_qty" class="app_label block">수량</label></div>
                <input
                  type="text"
                  id="id_{인덱스}_qty"
                  value={new Intl.NumberFormat("ko-KR").format(Math.floor(Number(품목.productInfo.qty)))}
                  oninput={e => {
                    가격계산(e, 품목, "수량");
                  }} />
              </div>
              <div class="app_col" style="--flex-basis: 10%;">
                <div><label for="id_{인덱스}_margin" class="app_label block">마진(%)</label></div>
                <input
                  type="text"
                  id="id_{인덱스}_margin"
                  value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.margin))}
                  oninput={e => {
                    가격계산(e, 품목, "마진");
                  }} />
              </div>
              <div class="app_col" style="--flex-basis: 40%;">
                <div><label for="id_{인덱스}_total_dome" class="app_label block">공급합계</label></div>
                <input type="text" id="id_{인덱스}_total_dome" value={new Intl.NumberFormat("ko-KR").format(Number(품목.productInfo.total_dome))} readonly />
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  <div class="app_footer">
    <button type="button" onclick={() => 품목추가(true)}>추가</button>
    <div style="display: flex; align-items:center;">
      <div style="margin: 0; padding: 0.5em 0.5em calc(0.5em - 1px); border: 1px solid #ddd; border-right: none; box-sizing: border-box; background: #eee; border-radius: 4px 0 0 4px">총합계</div>
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
    <div class="gap">&nbsp;</div>
    <div><button type="button" onclick={() => 엑셀파일선택?.click()}>엑셀자료 불러오기</button><input hidden type="file" accept=".xlsx,.xls" bind:this={엑셀파일선택} onchange={엑셀파싱} /></div>
  </div>
  {#if 선택상자열림}
    <div class="select_box" bind:this={선택상자} transition:fly={{ y: -10, duration: 100 }}>
      <ul>
        {#each 선택상자항목 as 선택항목, 인덱스}
          <li>
            <button
              type="button"
              class:searched={선택상자선택항목 == 인덱스}
              onclick={() => {
                if (isHTMLElement(선택상자호출자.요소) && 선택상자호출자.품목) {
                  if (선택상자호출자.유형 == "브랜드") {
                    선택상자호출자.품목.productInfo.product = "";
                    선택상자호출자.품목.productInfo.PROD_CD = "";
                    선택상자호출자.품목.productInfo.sell_price = 0;
                    선택상자호출자.품목.productInfo.dome_price = 0;
                    선택상자호출자.품목.productInfo.total_dome = 0;
                    선택상자호출자.품목.productInfo.useprop = false;
                    선택상자호출자.품목.productInfo.soldout = false;
                    if (선택상자호출자.요소 instanceof HTMLInputElement) 선택상자호출자.요소.value = 선택항목.brand ?? "";

                    const uuid = 선택상자호출자.품목.uuid;
                    if (uuid) setTimeout(() => 품목명입력란[uuid]?.focus(), 100);
                  } else if (선택상자호출자.유형 == "품목명") {
                    선택상자호출자.품목.productInfo.brand = 선택항목.brand;
                    선택상자호출자.품목.productInfo.product = 선택항목.product;
                    if (선택상자호출자.요소 instanceof HTMLInputElement) 선택상자호출자.요소.value = 선택항목.product ?? "";
                    if (!선택상자호출자.품목.productInfo.brand) return;
                    const 인덱스 = 전체품목[선택상자호출자.품목.productInfo.brand].findIndex(x => x.product == 선택상자호출자.품목?.productInfo.product);

                    if (인덱스 != -1) {
                      선택상자호출자.품목.productInfo.sell_price = Number(전체품목[선택상자호출자.품목.productInfo.brand][인덱스].price);
                      if (전체품목[선택상자호출자.품목.productInfo.brand][인덱스].custom_option == "1") {
                        선택상자호출자.품목.productInfo.useprop = true;
                      } else {
                        선택상자호출자.품목.productInfo.useprop = false;
                      }
                      선택상자호출자.품목.productInfo.soldout = Boolean(선택항목.soldout);
                      선택상자호출자.품목.productInfo.dome_price = 선택상자호출자.품목.productInfo.sell_price * ((100 - (선택상자호출자.품목.productInfo.margin ?? 0)) / 100);
                      선택상자호출자.품목.productInfo.total_dome = 선택상자호출자.품목.productInfo.dome_price * (선택상자호출자.품목.productInfo.qty ?? 0);
                      선택상자호출자.품목.productInfo.PROD_CD = 전체품목[선택상자호출자.품목.productInfo.brand][인덱스].PROD_CD;
                    }
                  }

                  선택상자열림 = false;
                }
              }}
              bind:this={선택상자요소배열[인덱스]}>
              {선택상자호출자.유형 == "브랜드" ? 선택항목.brand : 선택항목.product}{typeof 선택항목 != "string" && 선택항목.soldout ? " (품절)" : ""}
            </button>
          </li>
        {:else}
          <div class="noitem">선택할 수 있는 목록이 없습니다.</div>
        {/each}
      </ul>
    </div>
  {/if}
</div>
{#if 엑셀데이터선택창 && 엑셀데이터.length}
  <div class="excelWindow" transition:fade={{ duration: 100 }}>
    <div class="inner" transition:fly={{ y: 10, duration: 100 }}>
      <div class="app_header">
        <span>엑셀데이터 선택중입니다.</span><button
          type="button"
          onclick={() => {
            엑셀데이터선택창 = false;
            엑셀로딩 = false;
            엑셀데이터 = [];
            엑셀양식 = [];
          }}>닫기</button>
      </div>
      <div class="app_body">
        <div class="steps">
          <div class="app_label">열 제목으로 삼을 줄을 선택해주세요:</div>
          <select name="column" id="column" size="5" bind:value={엑셀제목줄} style="margin-bottom: 1em;">
            {#each 엑셀데이터 as 줄, 인덱스}
              <option value={인덱스}>{줄.join(" | ")}</option>
            {/each}
          </select>
          {#if 엑셀제목줄 >= 0}
            <div class="app_label">입력하고자 하는 데이터를 선택해주세요:</div>
            <div class="app_row">
              {#each [{ label: "고객명", width: "33%" }, { label: "전화번호1", width: "33%" }, { label: "전화번호2", width: "33%" }, { label: "우편번호", width: "50%" }, { label: "배송메시지", width: "50%" }, { label: "기본주소", width: "100%" }, { label: "상세주소", width: "80%" }, { label: "참고항목", width: "20%" }, { label: "품목명", width: "100%" }] as 선택항목, 인덱스}
                <div class="app_col" style="--flex-basis: {선택항목.width}">
                  <div><label for={선택항목.label} class="app_label block">{선택항목.label}</label></div>
                  <select name={선택항목.label} id={선택항목.label} bind:value={엑셀양식[인덱스]}>
                    <option value={-1}>없음</option>
                    {#each 엑셀데이터[엑셀제목줄] as 제목, 인덱스}
                      <option value={인덱스}>{제목}</option>
                    {/each}
                  </select>
                </div>
              {/each}
              <div class="app_col" style="--flex-basis: 100%; padding-top: 1em; display: flex; gap: 1em;"><button type="button" onclick={() => 엑셀자료입력()}>교체</button><button type="button" onclick={() => 엑셀자료입력(true)}>추가</button></div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .block {
    display: block;
  }

  .app_label {
    font-weight: bolder;
    margin: 0.5em 0;
  }

  .prod_item {
    border: 1px solid #ddd;
  }

  .app_header {
    display: flex;
    align-items: center;
    gap: 1em;
    padding: 1em;
    background-color: #eee;
    border-bottom: 1px solid #ddd;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .app_body .app_header {
    z-index: 1;
  }

  .radio_vertical {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
  }

  .app_radio {
    display: inline-flex;
    align-items: center;
    position: relative;
    font-weight: bolder;
  }
  .app_radio span {
    margin-top: auto;
  }

  .app_radio input[type="radio"] {
    width: 0;
    height: 0;
  }
  .app_radio:has(input[type="radio"])::before {
    content: "";
    border-radius: 999px;
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid #0002;
    background: white;
    transition: 0.1s;
  }
  .app_radio:has(input[type="radio"]):hover::before {
    border-color: #0004;
  }
  .app_radio:has(input[type="radio"]):active::before {
    transition: 0s;
    background: #0002;
  }
  .app_radio:has(input[type="radio"]:checked)::before {
    border-color: rgb(0, 109, 211);
  }

  .app_radio:has(input[type="radio"])::after {
    content: "";
    border-radius: 999px;
    width: calc(1em - 4px);
    height: calc(1em - 4px);
    position: absolute;
    left: 4px;
    transition: 0.1s;
  }
  .app_radio:has(input[type="radio"]:checked)::after {
    background: rgb(0, 109, 211);
  }

  .app_body {
    padding: 1em;
  }

  .app_row {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1em;
  }

  .app_row .app_col {
    flex: 1 1 100%;
    flex-basis: calc(var(--flex-basis) - 1em);
  }

  .postcodebox {
    border: 1px solid #ddd;
    margin-bottom: 1em;
  }
  input {
    box-sizing: border-box;
    border-color: #ddd;
    border-style: solid;
    border-width: 1px;
    border-radius: 4px;
  }

  input[type="text"] {
    width: 100%;
    margin-bottom: 1em;
    font-size: 1em;
    padding: 0.5em;
  }

  hr {
    border: none;
    border-top: 1px solid #ddd;
  }

  .select_box {
    position: fixed;
    background-color: white;
    border-radius: 0 0 6px 6px;
    border: 1px solid #ddd;
    top: calc(var(--selectbox_top) * 1px);
    left: calc(var(--selectbox_left) * 1px);
    width: calc(var(--selectbox_width) * 1px);
    max-height: 400px;
    overflow-y: auto;
    box-shadow: 0 2px 4px #0002;
    z-index: 3;
  }
  .select_box ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .select_box ul li button {
    padding: 0.5em;
    cursor: pointer;
    background-color: transparent;
    font-size: 1em;
    margin: 0;
    display: block;
    width: 100%;
    border: none;
    text-align: left;
  }
  .select_box ul li :is(button:hover, button.searched) {
    background-color: #eee;
  }
  .select_box .noitem {
    padding: 0.5em;
    color: #999;
    font-style: italic;
  }

  .app_footer {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    margin-top: 1em;
    margin-bottom: 300px;
    gap: 1em;
  }

  button {
    font-size: 1em;
    padding: 0.5em;
    box-sizing: border-box;
    border: 1px solid rgb(180, 186, 194);
    border-radius: 4px;
    background-color: rgb(233, 235, 237);
  }
  button:hover {
    background: rgb(208, 215, 223);
  }
  button:active {
    background: rgb(151, 160, 170);
  }

  .gap {
    flex-grow: 1;
  }

  .excelLoading {
    position: relative;
  }
  .excelLoading::after {
    position: absolute;
    content: "엑셀 데이터를 읽고 있습니다...";
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff6;
    top: 0;
    left: 0;
  }

  .excelWindow {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #fff3;
    z-index: 5;
  }
  .excelWindow .inner {
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 1em;
    position: absolute;
    overflow: hidden;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 640px;
    height: 480px;
    max-width: 100%;
    max-height: 100%;
    box-shadow: 0 2px 8px #0003;
    overflow-y: auto;
  }
  .excelWindow select {
    width: 100%;
  }
  @media screen and (max-width: 512px) {
    .app_row .app_col {
      flex-basis: 100%;
    }
  }
</style>
