<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";

  type 배송형태종류타입 = typeof 배송형태종류[number];
  
  type 품목리스트항목타입 = {
    uuid: string,
    productInfo: 제품정보타입,
    deliveryInfo: 배송정보타입
  }

  type 제품정보타입 = {
    itemType: 0|1|2,
    brand: string|undefined,
    product: string|undefined,
    prop: string|undefined,
    useprop: boolean,
    sell_price: number|undefined,
    dome_price: number|undefined,
    qty: number|undefined,
    margin: number|undefined,
    total_dome: number|undefined
  }

  type 배송정보타입 = {
    name: string|undefined,
    hp1: number|undefined,
    hp2: number|undefined,
    addr1: string|undefined,
    addr2: string|undefined,
    addr3: string|undefined,
    postcode: number|undefined,
    msg: string|undefined
  }

  let 선택상자열림 = $state(false);
  let 선택상자항목: string[]|object[] = $state([]);

  let 전체품목 = $state({});
  $inspect(선택상자항목);


  const 배송형태종류 = ['익일수령택배','방문수령','퀵착불','퀵선불','대리배송','전자배송',''] as const;
  let 배송형태:배송형태종류타입|undefined = $state();

  let 품목리스트:품목리스트항목타입[] = $state([]);

  function 배송형태변경 (e:Event) {
    const 값 = (e.target as HTMLSelectElement).value;
    if (배송형태종류.includes(값 as any)) {
      배송형태 = 값 as 배송형태종류타입;
    }
  }

  async function 가격계산 (e:Event, 품목: 품목리스트항목타입, 필드: string) {
    const 가능한필드 = ['소비자가','공급단가','수량','마진'];
    if (!가능한필드.includes(필드)) return;

    const 요소 = (e.currentTarget as HTMLInputElement);
    const 값 = 요소.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    
    const 복제된품목리스트 = [...$state.snapshot(품목리스트)];
    
    const 인덱스 = 복제된품목리스트.findIndex(요소 => 요소.uuid == 품목.uuid);
    
    if (인덱스 == -1) return;

    switch (필드) {
      case "소비자가":
        복제된품목리스트[인덱스].productInfo.sell_price = Number(값);
        복제된품목리스트[인덱스].productInfo.dome_price = Number(복제된품목리스트[인덱스].productInfo.sell_price) * (100 - Number(복제된품목리스트[인덱스].productInfo.margin))/100;
        break;
      case '공급단가':
        복제된품목리스트[인덱스].productInfo.dome_price = Number(값);
        복제된품목리스트[인덱스].productInfo.margin = 100 - (Number(복제된품목리스트[인덱스].productInfo.dome_price) / Number(복제된품목리스트[인덱스].productInfo.sell_price)) * 100;
        break;
      case '마진':
        복제된품목리스트[인덱스].productInfo.margin = Number(값);
        복제된품목리스트[인덱스].productInfo.dome_price = Number(복제된품목리스트[인덱스].productInfo.sell_price) * (100 - Number(복제된품목리스트[인덱스].productInfo.margin))/100;
        break;
      case '수량':
        요소.value = 요소.value.replace(/[^0-9]/g, '');
        복제된품목리스트[인덱스].productInfo.qty = Math.floor(Number(값));
    }
    복제된품목리스트[인덱스].productInfo.total_dome = Number(복제된품목리스트[인덱스].productInfo.dome_price) * Number(복제된품목리스트[인덱스].productInfo.qty);

    품목리스트 = 복제된품목리스트;
  }

  onMount(async ()=>{
    const 품목가져오기 = await fetch("https://b2b.soundcat.com/page/get_products.php", {
      "headers": {
        "Content-Type": "application/json"
      },
      "method": "POST",
      "body": JSON.stringify({
        "key": "b2b_write"
      })
    });

    if (품목가져오기.ok) {
      전체품목 = await 품목가져오기.json();
    }
    let 배송형태셀렉터:HTMLSelectElement|null = document.querySelector('#ex_1');
    const 초기값 = (배송형태셀렉터 as HTMLSelectElement).value;

    if (배송형태종류.includes(초기값 as any)) {
      배송형태 = 초기값 as 배송형태종류타입;
    }
    if (배송형태셀렉터) {
      배송형태셀렉터.addEventListener('change',배송형태변경);
    }

    if (품목리스트.length === 0) {
      품목리스트.push({
        uuid: crypto.randomUUID(),
        productInfo: {
          itemType: 0,
          brand: undefined,
          product: undefined,
          prop: undefined,
          useprop: false,
          sell_price: 0,
          dome_price: 0,
          qty: 0,
          margin: 0,
          total_dome: 0

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
        }
      })
    }
  });

  function 선택상자열기 (유형: string, 요소: HTMLElement, 브랜드: string|undefined = undefined) {
    선택상자열림 = true;
    if (유형 == '브랜드') {
      선택상자항목 = Object.keys(전체품목);
    }
    if (유형 == '제품명') {

    }
  }
  
  onDestroy(()=>{
    let 배송형태셀렉터:HTMLSelectElement|null = document.querySelector('#ex_1');
    if (배송형태셀렉터) {
      배송형태셀렉터.removeEventListener('change',배송형태변경);
    }
  });
</script>
<div class="app_container">
  <div class="prod_list">
    {#each 품목리스트 as 품목, 인덱스 (품목.uuid)}
    <div class="prod_item">
      <div class="header">
        <span><strong>품목{인덱스+1}</strong></span>
        <div class="radio_vertical">
          <div class="radio">
            <input type="radio" id="itemType1" name="itemType" value="0" bind:group={품목.productInfo.itemType}>
            <label class="label" for="itemType1">일반</label>
          </div>
          <div class="radio">
            <input type="radio" id="itemType2" name="itemType" value="1" bind:group={품목.productInfo.itemType}>
            <label  class="label"for="itemType2">데모(40%)</label>
          </div>
          <div class="radio">
            <input type="radio" id="itemType3" name="itemType" value="2" bind:group={품목.productInfo.itemType}>
            <label class="label" for="itemType3">데모(50%)</label>
          </div>
        </div>
      </div>
      <div class="body">
        {#if 배송형태 && ['대리배송','익일수령택배','퀵착불'].includes(배송형태)}
        <div class="deliveryInfo row">
          <div class="col" style="--flex-basis: 33%;">
            <div><label for="name" class="label block">고객명</label></div>
            <input type="text" id="name" bind:value={품목.deliveryInfo.name}>
          </div>
          <div class="col" style="--flex-basis: 33%;">
            <div><label for="hp1" class="label block">전화번호1</label></div>
            <input type="text" id="hp1" bind:value={품목.deliveryInfo.hp1}>
          </div>
          <div class="col" style="--flex-basis: 33%;">
            <div><label for="hp2" class="label block">전화번호2</label></div>
            <input type="text" id="hp2" bind:value={품목.deliveryInfo.hp2}>
          </div>
          <div class="col" style="--flex-basis: 100%;"><span class="label block">주소</span></div>
          <div class="col" style="--flex-basis: 50%">
            <input type="text" placeholder="우편번호" bind:value={품목.deliveryInfo.postcode}>
          </div>
          <div class="col" style="--flex-basis: 50%">
            <input type="text" placeholder="배송메시지" bind:value={품목.deliveryInfo.msg}>
          </div>
          <div class="col" style="--flex-basis: 100%">
            <input type="text" placeholder="기본주소" bind:value={품목.deliveryInfo.addr1}>
          </div>
          <div class="col" style="--flex-basis: 50%">
            <input type="text" placeholder="상세주소" bind:value={품목.deliveryInfo.addr2}>
          </div>
          <div class="col" style="--flex-basis: 50%">
            <input type="text" placeholder="참고항목" bind:value={품목.deliveryInfo.addr3}>
          </div>
        </div>
        <hr />
        {/if}
        <div class="prodInfo row">
          <div class="col" style="--flex-basis: 20%;">
            <div><label for="brand" class="label block">브랜드</label></div>
            <input type="text" id="brand" bind:value={품목.productInfo.brand} onfocus={(e)=>선택상자열기('브랜드',e.currentTarget)} onblur={()=>선택상자열림=false}>
          </div>
          <div class="col" style="--flex-basis: 80%;">
            <div><label for="product" class="label block">품목명</label></div>
            <input type="text" id="product" bind:value={품목.productInfo.product} onfocus={(e)=>선택상자열기('품목명',e.currentTarget,품목.productInfo.brand)} onblur={()=>선택상자열림=false}>
          </div>
          <div class="col" style="--flex-basis: 20%;">
            <div><label for="sell_price" class="label block">소비자가</label></div>
            <input type="text" id="sell_price" value={new Intl.NumberFormat('ko-KR').format(Number(품목.productInfo.sell_price))} oninput={(e)=>{가격계산(e,품목,"소비자가")}}>
          </div>
          <div class="col" style="--flex-basis: 20%;">
            <div><label for="dome_price" class="label block">공급단가</label></div>
            <input type="text" id="dome_price" value={new Intl.NumberFormat('ko-KR').format(Number(품목.productInfo.dome_price))} oninput={(e)=>{가격계산(e,품목,"공급단가")}}>
          </div>
          <div class="col" style="--flex-basis: 10%;">
            <div><label for="qty" class="label block">수량</label></div>
            <input type="text" id="qty" value={new Intl.NumberFormat('ko-KR').format(Math.floor(Number(품목.productInfo.qty)))} oninput={(e)=>{가격계산(e,품목,"수량")}}>
          </div>
          <div class="col" style="--flex-basis: 10%;">
          <div><label for="margin" class="label block">마진(%)</label></div>
            <input type="text" id="margin" value={new Intl.NumberFormat('ko-KR').format(Number(품목.productInfo.margin))} oninput={(e)=>{가격계산(e,품목,"마진")}}>
          </div>
          <div class="col" style="--flex-basis: 40%;">
          <div><label for="total_dome" class="label block">공급합계</label></div>
            <input type="text" id="total_dome" value={new Intl.NumberFormat('ko-KR').format(Number(품목.productInfo.total_dome))} readonly>
          </div>
        </div>
      </div>
    </div>
    {/each}
  </div>
</div>
<style>
  .block {
    display: block;
  }

  .label {
    font-weight: bolder;
    margin: 0.5em 0;
  }
  
  .prod_item {
    border: 1px solid #ddd;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 1em;
    padding: 1em;
    background-color: #eee;
    border-bottom: 1px solid #ddd;
  }

  .radio_vertical {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1em;
  }

  .body {
    padding: 1em;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1em;
  }

  .row .col {
    flex: 1 1 100%;
    flex-basis: calc(var(--flex-basis) - 1em);
  }
  input {
    box-sizing: border-box;
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
</style>