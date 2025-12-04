<script lang="ts">
  import { tick } from "svelte";
  import type { 품목리스트항목타입 } from "./type";
  import { fly } from "svelte/transition";

  let { 인덱스, 품목 = $bindable(), 우편번호검색열림 = $bindable(), 우편번호검색상자 = $bindable(), 우편번호상세입력란 = $bindable() } = $props();

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
        (document.querySelector(`#addr2_${품목.uuid}`) as HTMLInputElement)?.focus();
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
</script>

<div class="deliveryInfo app_row">
  <div
    class="app_col"
    style="--flex-basis: 33%;">
    <div>
      <label
        for="id_{인덱스}_name"
        class="app_label block">고객명</label>
    </div>
    <input
      type="text"
      id="id_{인덱스}_name"
      class:failed={품목.failed && !품목.deliveryInfo.name}
      bind:value={품목.deliveryInfo.name} />
  </div>
  <div
    class="app_col"
    style="--flex-basis: 33%;">
    <div>
      <label
        for="id_{인덱스}_hp1"
        class="app_label block">전화번호1</label>
    </div>
    <input
      type="text"
      id="id_{인덱스}_hp1"
      class:failed={품목.failed && !품목.deliveryInfo.hp1}
      bind:value={품목.deliveryInfo.hp1} />
  </div>
  <div
    class="app_col"
    style="--flex-basis: 33%;">
    <div>
      <label
        for="id_{인덱스}_hp2"
        class="app_label block">전화번호2</label>
    </div>
    <input
      type="text"
      id="id_{인덱스}_hp2"
      bind:value={품목.deliveryInfo.hp2} />
  </div>
  <div
    class="app_col"
    style="--flex-basis: 100%;">
    <div class="app_label block">
      <span style="margin-right: 0.5em">주소</span><button
        type="button"
        onclick={e => 우편번호검색(품목)}>주소 검색</button>
    </div>
  </div>
  {#if 우편번호검색열림[품목.uuid]}
    <div
      class="postcodebox app_col"
      style="--flex-basis: 100%"
      transition:fly={{ y: -10, duration: 100 }}>
      <div class="app_header">
        우편번호검색
        <button
          type="button"
          onclick={() => {
            우편번호검색열림[품목.uuid] = false;
          }}>닫기</button>
      </div>
      <div
        class="app_body"
        bind:this={우편번호검색상자[품목.uuid]}>
      </div>
    </div>
  {/if}
  <div
    class="app_col"
    style="--flex-basis: 50%">
    <input
      type="text"
      placeholder="우편번호"
      class:failed={품목.failed && !품목.deliveryInfo.postcode}
      bind:value={품목.deliveryInfo.postcode} />
  </div>
  <div
    class="app_col"
    style="--flex-basis: 50%">
    <input
      type="text"
      placeholder="배송메시지"
      bind:value={품목.deliveryInfo.msg} />
  </div>
  <div
    class="app_col"
    style="--flex-basis: 100%">
    <input
      type="text"
      placeholder="기본주소"
      class:failed={품목.failed && !품목.deliveryInfo.addr1}
      bind:value={품목.deliveryInfo.addr1} />
  </div>
  <div
    class="app_col"
    style="--flex-basis: 50%">
    <input
      id="addr2_{품목?.uuid}"
      type="text"
      placeholder="상세주소"
      class:failed={품목.failed && !품목.deliveryInfo.addr2}
      bind:value={품목.deliveryInfo.addr2} />
  </div>
  <div
    class="app_col"
    style="--flex-basis: 50%">
    <input
      type="text"
      placeholder="참고항목"
      bind:value={품목.deliveryInfo.addr3} />
  </div>
</div>
<hr />

<style>
  .app_header {
    z-index: 1;
  }

  hr {
    border: none;
    border-top: 1px solid #ddd;
  }

  .postcodebox {
    border: 1px solid #ddd;
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
  input.failed {
    background: #f002 !important;
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
</style>
