<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import type { 품목리스트항목타입 } from "./type";

  let { 엑셀데이터 = $bindable(), 엑셀데이터선택창 = $bindable(), 품목리스트 = $bindable(), 엑셀로딩 = $bindable() } = $props();

  let 엑셀제목줄 = $state(-1);
  let 엑셀양식 = $state([]);

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

    const 추가될품목리스트: 품목리스트항목타입[] = 엑셀데이터.slice(엑셀제목줄 + 1).map((줄: 품목리스트항목타입) => {
      return {
        uuid: crypto.randomUUID(),
        collapsed: false,
        failed: false,
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
</script>

<div
  class="excelWindow"
  transition:fade={{ duration: 100 }}>
  <div
    class="inner"
    transition:fly={{ y: 10, duration: 100 }}>
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
        <select
          name="column"
          id="column"
          size="5"
          bind:value={엑셀제목줄}
          style="margin-bottom: 1em;">
          {#each 엑셀데이터 as 줄, 인덱스}
            <option value={인덱스}>{줄.join(" | ")}</option>
          {/each}
        </select>
        {#if 엑셀제목줄 >= 0}
          <div class="app_label">입력하고자 하는 데이터를 선택해주세요:</div>
          <div class="app_row">
            {#each [{ label: "고객명", width: "33%" }, { label: "전화번호1", width: "33%" }, { label: "전화번호2", width: "33%" }, { label: "우편번호", width: "50%" }, { label: "배송메시지", width: "50%" }, { label: "기본주소", width: "100%" }, { label: "상세주소", width: "80%" }, { label: "참고항목", width: "20%" }, { label: "품목명", width: "100%" }] as 선택항목, 인덱스}
              <div
                class="app_col"
                style="--flex-basis: {선택항목.width}">
                <div>
                  <label
                    for={선택항목.label}
                    class="app_label block">{선택항목.label}</label>
                </div>
                <select
                  name={선택항목.label}
                  id={선택항목.label}
                  bind:value={엑셀양식[인덱스]}>
                  <option value={-1}>없음</option>
                  {#each 엑셀데이터[엑셀제목줄] as 제목, 인덱스}
                    <option value={인덱스}>{제목}</option>
                  {/each}
                </select>
              </div>
            {/each}
            <div
              class="app_col"
              style="--flex-basis: 100%; padding-top: 1em; display: flex; gap: 1em;">
              <button
                type="button"
                onclick={() => 엑셀자료입력()}>교체</button
              ><button
                type="button"
                onclick={() => 엑셀자료입력(true)}>추가</button>
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
</style>
