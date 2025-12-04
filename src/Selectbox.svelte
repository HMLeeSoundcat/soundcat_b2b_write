<script module>
  declare const Swal: typeof SwalType;
</script>

<script lang="ts">
  import { fly } from "svelte/transition";
  import type SwalType from "sweetalert2";
  import type { 배송형태종류타입, 선택상자호출자타입, 임시배열타입, 전체품목리스트, 품목리스트항목타입 } from "./type";
  import type { UIEventHandler } from "svelte/elements";
  import { 숫자로변환, 내용리셋 } from "./utils.svelte";

  interface 프롭스타입 {
    전체품목: 전체품목리스트;
    선택상자: HTMLElement | undefined;
    선택상자선택항목: number;
    선택상자호출자: 선택상자호출자타입;
    선택상자열림: boolean;
    선택상자조정: UIEventHandler<Window>;
    직접입력선택상자: HTMLElement | undefined;
    선택상자필터: 임시배열타입[] | undefined;
    선택상자항목: 임시배열타입[];
    선택상자요소배열: HTMLElement[];
    isHTMLElement: (element: any) => element is HTMLElement | HTMLInputElement;
    품절팝업열림: boolean;
    품목명입력란: Record<string, HTMLElement>;
    배송형태: 배송형태종류타입 | undefined;
    전자배송팝업내용: HTMLTextAreaElement | undefined;
    전자배송팝업열림: boolean;
    발주서상태: string;
    가격계산: (e: number | string | undefined, 품목: 품목리스트항목타입, 필드: string | undefined, 계산할브랜드: string | undefined) => void;
  }

  let { 전체품목, 선택상자 = $bindable(), 선택상자선택항목, 선택상자호출자 = $bindable(), 선택상자열림 = $bindable(), 선택상자조정, 직접입력선택상자 = $bindable(), 선택상자필터, 선택상자항목, 선택상자요소배열 = $bindable(), isHTMLElement, 품절팝업열림 = $bindable(), 품목명입력란, 배송형태, 전자배송팝업내용, 전자배송팝업열림, 발주서상태 = $bindable(), 가격계산 }: 프롭스타입 = $props();

  function 선택상자닫기(e: Event) {
    if (!((isHTMLElement(e.target) && isHTMLElement(선택상자) && 선택상자.contains(e.target)) || (isHTMLElement(선택상자호출자.요소) && isHTMLElement(e.target) && 선택상자호출자.요소.contains(e.target)))) {
      선택상자열림 = false;
    }
  }

  function 발주서유형변경(유형: string) {
    //@ts-ignore
    if (window.setOrderType) {
      //@ts-ignore
      const result = window.setOrderType(유형);
      발주서상태 = result;
      return result;
    }
  }

  async function 품절팝업() {
    let timerTimer: number;
    let timerTimerTimer: number;
    let dialog: HTMLElement | null;
    let dangerbtn: HTMLButtonElement | null | undefined;

    선택상자열림 = false;

    const swalpopup = await Swal.fire({
      title: "품절 안내",
      html: `<br />`,
      confirmButtonColor: "#FDAB29",
      icon: "warning",
      confirmButtonText: "선오더로 변경",
      showCancelButton: true,
      cancelButtonText: "계속 진행",
      showDenyButton: true,
      denyButtonText: "다시 입력",
      focusDeny: true,
      allowOutsideClick: () => {
        const popup = Swal.getPopup();
        if (!popup) return false;
        popup.classList.remove("animate__animated", "animate__fadeInDown", "animate__faster", "swal2-show");
        setTimeout(() => {
          popup.classList.add("animate__animated", "animate__headShake");
        });
        setTimeout(() => {
          popup.classList.remove("animate__animated", "animate__headShake");
        }, 500);
        return false;
      },
      willOpen: () => {
        품절팝업열림 = true;
        dialog = document.querySelector(".soldoutDialog");
        dangerbtn = dialog?.querySelector(".btn-danger-hold");
        if (dialog && dangerbtn) {
          dangerbtn.disabled = true;
          dangerbtn.innerText = "계속 진행(10)";
        }
      },
      didOpen: () => {
        var timer = 9;
        timerTimer = setInterval(() => {
          if (dialog && dangerbtn) dangerbtn.innerText = `계속 진행(${timer})`;
          timer--;
        }, 1000);
        timerTimerTimer = setTimeout(() => {
          if (dialog && dangerbtn) {
            dangerbtn.disabled = false;
            dangerbtn.innerText = "계속 진행";
            clearInterval(timerTimer);
          }
        }, 10000);
      },
      didClose: () => {
        품절팝업열림 = false;
        clearInterval(timerTimer);
        clearTimeout(timerTimerTimer);
      },
      customClass: {
        container: "soldoutDialog",
        confirmButton: "order-1",
        cancelButton: "btn-danger-hold order-2",
        denyButton: "order-3",
      },
    });

    return swalpopup;
  }

  function 마진셋업반영(인덱스: number, 브랜드: string) {
    const 품목 = 선택상자호출자.품목;
    if (품목) {
      const 마진셋업 = typeof 전체품목[브랜드][인덱스].default_margin == "object" ? 전체품목[브랜드][인덱스].default_margin : undefined;
      품목.default_margin = 마진셋업;
      if (!마진셋업) 품목.manual_mode = true;
      const 현재수량 = 품목.productInfo.qty ?? 0;
      const 타겟마진 = 현재수량 >= 숫자로변환(마진셋업?.per_user?.discount_qty ?? 마진셋업?.discount_qty, 999) ? 숫자로변환(마진셋업?.per_user?.discount_margin ?? 마진셋업?.discount_margin) : 숫자로변환(마진셋업?.per_user?.default_margin ?? 마진셋업?.default_margin);
      const 타겟공급가 = 현재수량 >= 숫자로변환(마진셋업?.per_user?.discount_qty ?? 마진셋업?.discount_qty, 999) ? 숫자로변환(마진셋업?.per_user?.discount_price ?? 마진셋업?.discount_price) : 숫자로변환(마진셋업?.per_user?.default_prov ?? 마진셋업?.default_prov);

      품목.productInfo.margin = 타겟마진;
      품목.productInfo.dome_price = 타겟공급가;
    }
  }

  async function 선택상자항목선택(선택항목: 임시배열타입) {
    if (isHTMLElement(선택상자호출자.요소) && 선택상자호출자.품목) {
      const 품목 = 선택상자호출자.품목;
      const 요소 = 선택상자호출자.요소;

      if (선택상자호출자.유형 == "브랜드") {
        if (요소 instanceof HTMLInputElement) 품목.productInfo.brand = 선택항목.brand ?? "";

        const uuid = 품목.uuid;
        if (uuid) setTimeout(() => 품목명입력란[uuid]?.focus(), 100);
      } else if (선택상자호출자.유형 == "품목명") {
        let 실시간품절여부 = false;
        선택항목.checking = true;

        if (!선택항목.bypass_soldout) {
          try {
            const response = await fetch("https://b2b.soundcat.com/page/get_stock.php", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key: 선택항목.PROD_CD,
                req: "soundcat",
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.Errors) throw result.Errors;
              if (!(result.Data.Result && result.Data.Result[0] && result.Data.Result[0].BAL_QTY && result.Data.Result[0].PROD_CD == 선택항목.PROD_CD)) 실시간품절여부 = true;
            }
          } catch (err) {
            console.error(err);
          }

          //@ts-ignore
          if (window.getOrderType) 발주서상태 = window.getOrderType();

          if (선택항목.software == "0" && 발주서상태 != "선오더" && (선택항목.soldout || 실시간품절여부)) {
            const 품절팝업결과 = (await 품절팝업()) as { isConfirmed: any; isDenied: any; dismiss: any };
            if (품절팝업결과.isDenied) {
              내용리셋(품목);
              return;
            }

            if (품절팝업결과.isConfirmed) {
              const result = 발주서유형변경("선오더");
              if (result != "선오더") {
                Swal.fire({
                  icon: "error",
                  title: "알림!",
                  text: "현재 선오더 발주 가능 기간이 아닙니다!",
                  confirmButtonText: "확인",
                });
                return false;
              }
            }
          }
        }

        if (선택항목.software == "1" && 배송형태 != "전자배송") {
          const swal = await Swal.fire({
            title: "알림!",
            html: `<!--.esd-popup .swal-html-container --><br />`,
            confirmButtonColor: "#FDAB29",
            icon: "warning",
            confirmButtonText: "확인",
            showCancelButton: true,
            cancelButtonText: "다시 선택",
            allowOutsideClick: () => {
              const popup = Swal.getPopup();
              popup?.classList.remove("animate__animated", "animate__fadeInDown", "animate__faster", "swal2-show");
              setTimeout(() => {
                popup?.classList.add("animate__animated", "animate__headShake");
              });
              setTimeout(() => {
                popup?.classList.remove("animate__animated", "animate__headShake");
              }, 500);
              return false;
            },
            preConfirm: () => {
              if (!전자배송팝업내용?.value) {
                return Swal.showValidationMessage("수신 받을 이메일 주소를 입력하세요!");
              } else {
                try {
                  //@ts-ignore
                  CKEDITOR.instances.wr_content.setData("<p>수신 받을 이메일 주소: </p><p>" + (전자배송팝업내용.value.replaceAll("\n", "<br>") + "</p>"));
                } catch {
                  if (!document.querySelector("#wr_content")) return;
                  (document.querySelector("#wr_content") as HTMLTextAreaElement).value = "수신 받을 이메일 주소:\n" + 전자배송팝업내용.value;
                }
              }
            },
            willOpen: () => {
              전자배송팝업열림 = true;
            },
            customClass: {
              container: "esd-popup",
            },
          });

          if (swal.isConfirmed) {
            //@ts-ignore
            window.setDeliveryType("전자배송");
            //@ts-ignore
            window.wr_content_open(true);
            document.querySelector("#use_content")?.setAttribute("checked", "checked");
          } else {
            return false;
          }
        }

        품목.productInfo.brand = 선택항목.brand;
        품목.productInfo.product = 선택항목.product;
        if (요소 instanceof HTMLInputElement) 요소.value = 선택항목.product ?? "";
        if (!품목.productInfo.brand) return;
        const 인덱스 = 전체품목[품목.productInfo.brand].findIndex(x => x.product == 품목?.productInfo.product);

        if (인덱스 != -1) {
          품목.productInfo.sell_price = Number(전체품목[품목.productInfo.brand][인덱스].price);
          if (전체품목[품목.productInfo.brand][인덱스].custom_option == "1") {
            품목.productInfo.useprop = true;
          } else {
            품목.productInfo.useprop = false;
          }
          품목.productInfo.soldout = Boolean(선택항목.soldout);
          품목.productInfo.dome_price = 품목.productInfo.sell_price * ((100 - (품목.productInfo.margin ?? 0)) / 100);
          if (전체품목[품목.productInfo.brand][인덱스].default_margin) 마진셋업반영(인덱스, 품목.productInfo.brand);
          품목.productInfo.total_dome = 품목.productInfo.dome_price * (품목.productInfo.qty ?? 0);
          품목.productInfo.PROD_CD = 전체품목[품목.productInfo.brand][인덱스].PROD_CD;
        }
        가격계산(undefined, 품목, undefined, 품목.productInfo.brand);
      }
      선택항목.checking = false;

      선택상자열림 = false;
    }
  }
</script>

<svelte:window
  onpointerdown={선택상자닫기}
  onresize={선택상자조정}
  onscroll={선택상자조정} />
<div
  class="select_box"
  bind:this={선택상자}
  transition:fly={{ y: -10, duration: 100 }}>
  <ul>
    <li>
      <button
        type="button"
        class:searched={선택상자선택항목 == -1}
        onclick={() => {
          if (선택상자호출자 && 선택상자호출자.품목) {
            선택상자호출자.품목.productInfo.sell_price = 0;
            선택상자호출자.품목.productInfo.PROD_CD = "etc_001";
            if (선택상자호출자.요소) (선택상자호출자.요소 as HTMLInputElement).select();
            선택상자열림 = false;
            선택상자호출자.품목.default_margin = undefined;
            선택상자호출자.품목.manual_mode = true;
          }
        }}
        bind:this={직접입력선택상자}><span class="selectbox-text"><i>직접입력</i></span></button>
    </li>
    {#each Array.isArray(선택상자필터) ? 선택상자필터 : 선택상자항목 as 선택항목, 인덱스}
      <li class={[선택항목.checking && "checking"]}>
        <button
          type="button"
          class:searched={선택상자선택항목 == 인덱스}
          onclick={() => 선택상자항목선택(선택항목)}
          bind:this={선택상자요소배열[인덱스]}>
          <span class="selectbox-text">{선택상자호출자.유형 == "브랜드" ? 선택항목.brand : 선택항목.product}{typeof 선택항목 != "string" && 선택항목.soldout && !선택항목.software ? " (품절)" : ""}</span>
          {#if 선택항목.stock_level}
            <span class="stock_level">
              <span
                class="stock_level_active"
                data-stock-level={선택항목.stock_level ?? 0}>
                {#each new Array(선택항목.stock_level)}
                  <span class="stock_level_bar"></span>
                {/each}
              </span>
              <span class="stock_level_bg">
                <span class="stock_level_bar"></span>
                <span class="stock_level_bar"></span>
                <span class="stock_level_bar"></span>
                <span class="stock_level_bar"></span>
              </span>
            </span>
          {/if}
        </button>
      </li>
    {:else}
      <div class="noitem">선택할 수 있는 목록이 없습니다.</div>
    {/each}
  </ul>
</div>

<style>
  .select_box {
    position: fixed;
    background-color: white;
    border-radius: 0 0 6px 6px;
    border: 1px solid #ddd;
    top: calc(var(--selectbox_top) * 1px);
    left: calc(var(--selectbox_left) * 1px);
    width: calc(var(--selectbox_width) * 1px);
    max-height: 400px;
    box-shadow: 0 2px 4px #0002;
    z-index: 3;
    overflow: hidden;
    display: flex;
  }
  .select_box ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: block;
    width: 100%;
    overflow-y: auto;
  }
  .select_box ul li button {
    padding: 0.5em;
    cursor: pointer;
    background-color: transparent;
    font-size: 1em;
    margin: 0;
    display: flex;
    width: 100%;
    border: none;
    text-align: left;
  }
  .selectbox-text {
    flex-grow: 1;
    margin: 0;
    padding: 0;
  }
  .stock_level * {
    margin: 0;
    padding: 0;
  }
  .select_box ul li :is(button:hover, button.searched) {
    background-color: #eee;
  }
  .select_box:has(.checking)::after {
    content: "재고 확인 중...";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #fffc;
    z-index: 99;
    border-radius: 0 0 6px 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
  }
  .select_box .noitem {
    padding: 0.5em;
    color: #999;
    font-style: italic;
  }
  .stock_level {
    position: relative;
    flex-basis: 2em;
  }

  .stock_level_bg,
  .stock_level_active {
    top: 50%;
    height: 80%;
    max-height: 20px;
    display: flex;
    transform: translateY(-50%);
    gap: 1px;
  }

  .stock_level_bg {
    position: relative;
  }

  .stock_level_active {
    position: absolute;
    left: 0;
  }

  .stock_level_active[data-stock-level="1"] {
    --stock-level-color: red;
  }

  .stock_level_active[data-stock-level="2"] {
    --stock-level-color: orange;
  }

  .stock_level_active[data-stock-level="3"] {
    --stock-level-color: yellow;
  }

  .stock_level_active[data-stock-level="4"] {
    --stock-level-color: green;
  }

  .stock_level_bar {
    height: 100%;
    width: 4px;
    background-color: var(--stock-level-color, #0002);
    border-radius: 2px;
  }
</style>
