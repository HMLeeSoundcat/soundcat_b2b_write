<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import type { 품목리스트항목타입, 전체품목리스트, 개별품목정보 } from "./type";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import { 숫자로변환, bigrams, similarity, tokenScore, 품목정보가져오기 } from "./utils.svelte";
  import { onMount } from "svelte";

  interface Props {
    엑셀데이터: any[];
    엑셀데이터선택창: boolean;
    품목리스트: 품목리스트항목타입[];
    엑셀로딩: boolean;
    전체품목: 전체품목리스트;
    품목추가: ({ 복제, 데이터 }: { 복제?: boolean; 데이터?: 품목리스트항목타입[] | 품목리스트항목타입 }) => void;
  }

  interface 엑셀데이터 {
    고객명: string;
    전화번호1: string;
    전화번호2: string;
    우편번호: string;
    배송메시지: string;
    기본주소: string;
    상세주소: string;
    참고항목: string;
    품목명: string;
    옵션: string;
    수량: string;
    brand: string;
    product: string;
    PROD_CD: string;
    출처?: 개별품목정보;
  }

  let { 엑셀데이터 = $bindable(), 엑셀데이터선택창 = $bindable(), 품목리스트 = $bindable(), 엑셀로딩 = $bindable(), 전체품목, 품목추가 }: Props = $props();

  let 엑셀제목줄 = $state(-1);

  const 모든품목 = $derived(
    Object.values(전체품목)
      .flat()
      .flatMap(품목 => ({ ...품목, value: 품목.PROD_CD, text: 품목.product, brand: 품목.brand, price: 품목.price, default_margin: 품목.default_margin })),
  );

  let 가공된엑셀데이터: 엑셀데이터[] = $state([
    {
      고객명: "",
      전화번호1: "",
      전화번호2: "",
      우편번호: "",
      배송메시지: "",
      기본주소: "",
      상세주소: "",
      참고항목: "",
      품목명: "",
      수량: "",
      brand: "",
      product: "",
      PROD_CD: "",
      옵션: "",
    },
  ]);

  let 매칭할품목 = $state(new SvelteMap<string, { 품목명: string; brand: string; product: string; PROD_CD: string; option: string }>());
  $inspect(매칭할품목);

  let 최대화여부 = $state(false);

  let 다음 = $state(false);
  let 그다음 = $state(false);

  let step1box: HTMLElement | undefined = $state();

  const 필드양식 = [
    { label: "고객명", width: "33%" },
    { label: "전화번호1", width: "33%" },
    { label: "전화번호2", width: "33%" },
    { label: "우편번호", width: "50%" },
    { label: "배송메시지", width: "50%" },
    { label: "기본주소", width: "100%" },
    { label: "상세주소", width: "50%" },
    { label: "참고항목", width: "50%" },
    { label: "품목명", width: "50%" },
    { label: "옵션", width: "50%" },
    { label: "수량", width: "100%" },
  ];

  let 엑셀양식: number[] = $state([]);
  let 초기화됨 = $state(false);

  onMount(() => {
    엑셀양식 = new Array(필드양식.length).fill(-1);
  });
  $inspect(엑셀양식);

  $effect(() => {
    if (step1box && (step1box as HTMLDetailsElement).open && 엑셀제목줄 !== -1) (step1box as HTMLDetailsElement).open = false;
  });

  $effect(() => {
    if (엑셀제목줄 < 0 || 초기화됨) return;
    for (let i = 0; i < 엑셀양식.length; i++) {
      let score = 0;
      let nominated = -1;
      for (let j = 0; j < 검색용데이터.length; j++) {
        const 유사도 = similarity(bigrams(검색용데이터[j]), bigrams(필드양식[i].label));
        if (유사도 > score) {
          score = 유사도;
          nominated = j;
        }
      }

      if (nominated !== -1) {
        if (엑셀양식.includes(nominated)) continue;
        엑셀양식[i] = nominated;
      }
    }
    초기화됨 = true;
  });

  const 검색용데이터: string[] = $derived(structuredClone($state.snapshot(엑셀데이터[엑셀제목줄])));

  function 엑셀데이터후처리() {
    if (엑셀양식.filter(x => x !== -1).length < 2) {
      alert("최소한 고객명과 품목명은 매핑해주세요.");
      return;
    }
    const 고객명 = 엑셀양식[0];
    const 전화번호1 = 엑셀양식[1];
    const 전화번호2 = 엑셀양식[2];
    const 우편번호 = 엑셀양식[3];
    const 배송메시지 = 엑셀양식[4];
    const 기본주소 = 엑셀양식[5];
    const 상세주소 = 엑셀양식[6];
    const 참고항목 = 엑셀양식[7];
    const 품목명 = 엑셀양식[8];
    const 옵션 = 엑셀양식[9];
    const 수량 = 엑셀양식[10];

    매칭할품목 = new SvelteMap<string, { 품목명: string; brand: string; product: string; PROD_CD: string; option: string }>();
    가공된엑셀데이터 = 엑셀데이터.slice(엑셀제목줄 + 1).map((줄: string[]) => {
      const obj: 엑셀데이터 = {
        고객명: 고객명 !== undefined ? 줄[고객명] : "",
        전화번호1: 전화번호1 !== undefined ? 줄[전화번호1] : "",
        전화번호2: 전화번호2 !== undefined ? 줄[전화번호2] : "",
        우편번호: 우편번호 !== undefined ? 줄[우편번호] : "",
        배송메시지: 배송메시지 !== undefined ? 줄[배송메시지] : "",
        기본주소: 기본주소 !== undefined ? 줄[기본주소] : "",
        상세주소: 상세주소 !== undefined ? 줄[상세주소] : "",
        참고항목: 참고항목 !== undefined ? 줄[참고항목] : "",
        품목명: 품목명 !== undefined ? 줄[품목명] : "",
        옵션: 옵션 !== undefined ? 줄[옵션] : "",
        수량: 수량 !== undefined ? 줄[수량] : "",
        brand: "",
        product: "",
        PROD_CD: "",
        출처: undefined,
      };

      const target = obj.품목명 + obj.옵션;
      let score = 0;
      let nominated = [];
      let finalItem = null;
      for (const 품목 of 모든품목) {
        if (!품목.text) continue;
        const 유사도 = similarity(bigrams(target), bigrams(품목.text + 품목.brand));
        if (유사도 > 0) {
          nominated.push(품목);
        }
      }
      score = 0;
      for (const 품목 of nominated) {
        if (!품목.text) continue;
        const 유사도 = tokenScore(품목.text.toLowerCase().split(/\s+/), target, 2);
        if (유사도 > score) {
          score = 유사도;
          finalItem = 품목;
        }
      }

      if (finalItem) {
        obj.brand = finalItem.brand ?? "";
        obj.product = finalItem.text ?? "";
        obj.PROD_CD = finalItem.value ?? "";
        obj.출처 = finalItem;
      }

      const 가공된obj = { 품목명: obj.품목명, brand: obj.brand, product: obj.product, PROD_CD: obj.PROD_CD, option: obj.옵션 };
      매칭할품목.set(
        JSON.stringify({
          품목명: 가공된obj.품목명,
          option: 가공된obj.option,
        }),
        가공된obj,
      );
      return obj;
    });
    다음 = true;
  }

  function 품목명매칭완료() {
    가공된엑셀데이터 = 가공된엑셀데이터.map(줄 => {
      const 매칭된품목 = 매칭할품목.get(
        JSON.stringify({
          품목명: 줄.품목명,
          option: 줄.옵션,
        }),
      );
      if (매칭된품목) {
        return { ...줄, ...매칭된품목 };
      }
      return 줄;
    });
    그다음 = true;
  }

  function 엑셀자료입력(추가: boolean = false) {
    if (!추가) 품목리스트 = [];

    for (const 줄 of 가공된엑셀데이터) {
      const 품목: 품목리스트항목타입 = {
        uuid: crypto.randomUUID(),
        collapsed: false,
        failed: false,
        productInfo: {
          product: 줄.product,
          PROD_CD: 줄.PROD_CD || "etc_001",
          brand: 줄.brand || "",
          sell_price: 숫자로변환(줄.출처?.price, 0),
          dome_price: 0,
          qty: 줄.수량 ? 숫자로변환(줄.수량, 0) : 0,
          margin: 0,
          total_dome: 0,
          prop: !줄.PROD_CD ? 줄.옵션 : "",
          useprop: !줄.PROD_CD,
          itemType: 0,
          soldout: false,
        },
        deliveryInfo: {
          name: 줄.고객명,
          hp1: 줄.전화번호1,
          hp2: 줄.전화번호2,
          postcode: 줄.우편번호,
          msg: 줄.배송메시지,
          addr1: 줄.기본주소,
          addr2: 줄.상세주소,
          addr3: 줄.참고항목,
        },
        default_margin: 줄.출처?.default_margin,
      };
      품목추가({ 복제: false, 데이터: 품목 });
    }

    엑셀양식 = [];
    엑셀제목줄 = -1;
    엑셀데이터 = [];
    엑셀데이터선택창 = false;
    엑셀로딩 = false;
  }
</script>

<div class="excelWindow" transition:fade={{ duration: 100 }}>
  <div class="inner" style={최대화여부 ? "width: 100%; height: 100%; border-radius: 0;" : ""} transition:fly={{ y: 10, duration: 100 }}>
    <div class="app_header">
      <span>엑셀데이터 선택중입니다.</span><button
        type="button"
        onclick={() => {
          엑셀데이터선택창 = false;
          엑셀로딩 = false;
          엑셀데이터 = [];
          엑셀양식 = [];
        }}>닫기</button>
      <div class="gap"></div>
      <button type="button" aria-label="창 크기 키우기/줄이기" title="창 크기 키우기/줄이기" onclick={() => (최대화여부 = !최대화여부)}>
        <i class={["fas", 최대화여부 ? "fa-compress" : "fa-expand"]}></i>
      </button>
    </div>
    <div class="app_body">
      <div class="steps">
        <details open bind:this={step1box}>
          <summary class="title app_label" style="cursor: pointer">1단계: 먼저 어느 줄이 제목 줄인지 선택해주세요. </summary>
          <select name="column" id="column" size="5" bind:value={엑셀제목줄} style="margin-bottom: 1em;">
            {#each 엑셀데이터 as 줄, 인덱스}
              <option value={인덱스}>{줄.join(" | ")}</option>
            {/each}
          </select>
        </details>
        {#if 엑셀제목줄 >= 0}
          <details open={!다음}>
            <summary class="title app_label">2단계: 각 항목에 맞게 선택해주세요.</summary>
            <div class="app_row">
              {#each 필드양식 as 선택항목, 인덱스}
                <div class="app_col" style="--flex-basis: {선택항목.width}">
                  <div>
                    <label for={선택항목.label} class="app_label block">{선택항목.label}</label>
                  </div>
                  <select
                    name={선택항목.label}
                    id={선택항목.label}
                    placeholder="선택"
                    {@attach node => {
                      const ts = new TomSelect(node, {
                        create: false,
                        options: 검색용데이터.map((제목: string, index: number) => ({ value: index, text: 제목 })),
                        searchField: ["text"],
                        maxItems: 1,
                        items: [String(엑셀양식[인덱스])],
                        placeholder: "선택",
                        selectOnTab: true,
                        sortField: "text",
                        onChange: (value: string) => {
                          엑셀양식[인덱스] = value ? parseInt(value) : -1;
                        },
                      });
                      return () => ts.destroy();
                    }}>
                  </select>
                </div>
              {/each}
              <div class="app_col" style="margin-top: 1em">
                <button type="button" onclick={() => 엑셀데이터후처리()}>{다음 ? "업데이트" : "다음"}</button>
              </div>
            </div>
          </details>
        {/if}
        {#if 다음}
          <details open={!그다음}>
            <summary class="title app_label">3단계: 품목명을 일치시켜 주세요.</summary>
            {#key 엑셀양식[8]}
              {#each 매칭할품목.values() as 줄}
                <div class="app_row" style="align-items: center; gap: 1em;">
                  <div class="app_col" style="--flex-basis: 50%;">
                    {줄.품목명}
                    {줄.option ? `(${줄.option})` : ""}
                  </div>
                  <div class="app_col" style="--flex-basis: 50%;">
                    <select
                      value={줄}
                      {@attach node => {
                        const ts = new TomSelect(node, {
                          options: 모든품목,
                          searchField: ["text", "value"],
                          placeholder: "선택",
                          selectOnTab: true,
                          create: false,
                          items: [줄.PROD_CD || undefined],
                          maxItems: 1,
                          onChange: (value: string) => {
                            const 선택된품목 = 모든품목.find(x => x.value === value);
                            if (선택된품목 && 선택된품목.value && 선택된품목.text && 선택된품목.brand) {
                              const 데이터 = { 품목명: 줄.품목명, brand: 선택된품목.brand, product: 선택된품목.text, PROD_CD: 선택된품목.value, option: 줄.option, price: 선택된품목.price ?? 0 };
                              매칭할품목.set(JSON.stringify({ 품목명: 줄.품목명, option: 줄.option }), 데이터);
                            }
                          },
                        });
                        return () => ts.destroy();
                      }}>
                      <option value={-1}>선택</option>
                    </select>
                  </div>
                </div>
              {/each}
            {/key}
            <div class="app_col" style="margin-top: 1em">
              <button type="button" onclick={() => 품목명매칭완료()}>{그다음 ? "업데이트" : "다음"}</button>
            </div>
          </details>
        {/if}
        {#if 그다음}
          <div class="app_row" style="margin-top: 1em; padding-top: 1em; border-top: 1px solid #0003">
            <div><b>현재 발주서 품목을 어떻게 할까요?</b></div>
            <div class="app_col" style="--flex-basis: 100%; margin-top: 1em; display: flex; gap: 1em;">
              <button type="button" onclick={() => 엑셀자료입력()}>교체하여 추가</button><button type="button" onclick={() => 엑셀자료입력(true)}>유지하여 추가</button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  :global(.soldoutDialog p) {
    margin: 0;
    margin-bottom: 1em;
  }
  .block {
    display: block;
  }

  .app_label {
    font-weight: bolder;
    margin: 0.5em 0;
  }

  .app_label.title {
    font-size: 1.2em;
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

  .app_body {
    padding: 1em;
    color: #222;
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

  @media screen and (max-width: 640px) {
    .app_row .app_col {
      flex-basis: 100%;
    }
  }

  .excelWindow {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #0006;
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
    transition:
      width 0.4s,
      height 0.4s;
    transition-timing-function: linear(0 0%, 0.91 3.64%, 0.97 23.43%, 0.99 47.59%, 1 73.92%, 1 100%);
  }
  .excelWindow select {
    width: 100%;
  }

  .gap {
    flex-grow: 1;
  }

  select {
    font-size: 1em;
    padding: 0.2em;
    border: 1px solid #0004;
    border-radius: 4px;
  }
</style>
