import "./style.css";
import { lookupDiplomatic } from "./data/diplomatic";
import { lookupMilitary } from "./data/military";
import { lookupRegion } from "./data/regions";
import { sanitizeDigit, sanitizeLetter, sanitizeLetters } from "./plate-letters";
import type { DiplomaticVariant, PlateType } from "./types";

interface State {
  plateType: PlateType;
  diplomaticVariant: DiplomaticVariant;
  letter1: string;
  digits3: string;
  series2: string;
  region: string;
  milDigits4: string;
  milLetters2: string;
  milCode: string;
  dipCode: string;
  dipRegion: string;
}

const state: State = {
  plateType: "civilian",
  diplomaticVariant: "ambassador",
  letter1: "А",
  digits3: "123",
  series2: "АА",
  region: "77",
  milDigits4: "1234",
  milLetters2: "АВ",
  milCode: "99",
  dipCode: "150",
  dipRegion: "77",
};

const appElement = document.getElementById("app");
if (!appElement) throw new Error("#app not found");
const app: HTMLElement = appElement;

function getLookupCode(): string {
  if (state.plateType === "civilian") return state.region;
  if (state.plateType === "military") return state.milCode;
  return state.dipCode;
}

function runDiplomaticLookup(countryCode: string): { found: boolean; title: string; detail: string } {
  const normalized = countryCode.trim().padStart(3, "0").slice(-3);
  if (!normalized) {
    return { found: false, title: "Введите код", detail: "" };
  }

  const country = lookupDiplomatic(normalized);
  const regionName = lookupRegion(state.dipRegion);
  const regionLine = regionName
    ? `Регион: ${regionName} (${state.dipRegion})`
    : state.dipRegion
      ? `Код ${state.dipRegion} не включен в Приказ МВД России от 5 октября 2017 г. N 766
"О государственных регистрационных знаках транспортных средств"`
      : "";

  if (country) {
    return {
      found: true,
      title: country,
      detail: [`Код ${normalized}`, regionLine].filter(Boolean).join(" · "),
    };
  }

  return {
    found: false,
    title: "Код не найден",
    detail: [`Код «${normalized}» не включен в Приказ МВД России от 5 октября 2017 г. N 766
"О государственных регистрационных знаках транспортных средств".`, regionLine]
      .filter(Boolean)
      .join(" · "),
  };
}

function runLookup(code: string): { found: boolean; title: string; detail: string } {
  const trimmed = code.trim();
  if (!trimmed) {
    return { found: false, title: "Введите код", detail: "" };
  }

  if (state.plateType === "civilian") {
    const name = lookupRegion(trimmed);
    return name
      ? { found: true, title: name, detail: `Код ${trimmed}` }
      : {
          found: false,
          title: "Регион не найден",
          detail: `Код «${trimmed}» не включен в Приказ МВД России от 5 октября 2017 г. N 766
"О государственных регистрационных знаках транспортных средств"`,
        };
  }

  if (state.plateType === "military") {
    const name = lookupMilitary(trimmed);
    return name
      ? { found: true, title: name, detail: `Код ${trimmed}` }
      : {
          found: false,
          title: "Код не найден",
          detail: `Код «${trimmed}» не найден в перечне цифровых кодов`,
        };
  }

  return runDiplomaticLookup(trimmed);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function plateInput(
  cssClass: string,
  field: string,
  value: string,
  maxLength: number,
  placeholder: string,
): string {
  return `<input
    type="text"
    class="${cssClass}"
    maxlength="${maxLength}"
    value="${escapeAttr(value)}"
    placeholder="${escapeAttr(placeholder)}"
    data-field="${field}"
    autocomplete="off"
  />`;
}

function renderPlateMain(): string {
  if (state.plateType === "civilian") {
    return `
      ${plateInput("series1", "series1", state.letter1, 1, "A")}
      ${plateInput("number", "digits3", state.digits3, 3, "777")}
      ${plateInput("series2", "series2", state.series2, 2, "AA")}
    `;
  }

  if (state.plateType === "military") {
    return `
      ${plateInput("digits4", "milDigits4", state.milDigits4, 4, "1234")}
      ${plateInput("letters2", "milLetters2", state.milLetters2, 2, "AA")}
    `;
  }

  const code = plateInput("dip-code", "dipCode", state.dipCode, 3, "087");

  if (state.diplomaticVariant === "ambassador") {
    return `${code}<span class="plate-static">CD</span><span class="plate-static">0</span>`;
  }

  const status = state.diplomaticVariant === "diplomat" ? "D" : "T";
  return `${code}<span class="plate-static">${status}</span><span class="plate-static">000</span>`;
}

function renderPlate(): string {
  const regionValue =
    state.plateType === "civilian"
      ? state.region
      : state.plateType === "military"
        ? state.milCode
        : state.dipRegion;

  const regionPlaceholder =
    state.plateType === "military" ? "14" : "77";

  const rusMarkup =
    state.plateType === "civilian"
      ? `<img class="plate-ng__rus" src="./rus.svg" width="38" height="11" alt="RUS" />`
      : `<span class="plate-ng__rus-text" aria-hidden="true">RUS</span>`;

  return `
    <div class="plate-ng plate-ng--${state.plateType}" data-plate="">
      <div class="plate-ng__number">
        ${renderPlateMain()}
      </div>
      <div class="plate-ng__region">
        ${plateInput("region", "regionSlot", regionValue, 3, regionPlaceholder)}
        ${rusMarkup}
      </div>
    </div>
  `;
}

function render(): void {
  const lookup = runLookup(getLookupCode());
  const typeLabels: Record<PlateType, string> = {
    civilian: "Обычные",
    diplomatic: "Дипломатические",
    military: "Военные",
  };

  app.innerHTML = `
    <header>
      <nav class="type-switcher" aria-label="Тип номера">
        ${(["civilian", "diplomatic", "military"] as PlateType[])
          .map(
            (t) => `
          <button type="button" class="type-btn ${state.plateType === t ? "active" : ""}" data-type="${t}">
            <span class="type-swatch type-swatch--${t}"></span>
            ${typeLabels[t]}
          </button>
        `,
          )
          .join("")}
      </nav>
    </header>

    <main class="content">
    <section class="plate-section">
      <div class="plate-wrap">
        ${renderPlate()}
      </div>
    </section>

    ${
      state.plateType === "diplomatic"
        ? `
      <div class="diplomatic-variants">
        <button type="button" class="variant-btn ${state.diplomaticVariant === "ambassador" ? "active" : ""}" data-variant="ambassador">CD</button>
        <button type="button" class="variant-btn ${state.diplomaticVariant === "diplomat" ? "active" : ""}" data-variant="diplomat">D</button>
        <button type="button" class="variant-btn ${state.diplomaticVariant === "staff" ? "active" : ""}" data-variant="staff">T</button>
      </div>
    `
        : ""
    }

      <section class="lookup-section">
        <div class="lookup-result ${lookup.found ? "found" : lookup.detail ? "missing" : "muted"}">
          ${
            lookup.detail
              ? `<span class="lookup-result__title">${lookup.title}</span><span class="lookup-result__detail">${lookup.detail}</span>`
              : `<span class="lookup-result__placeholder">${lookup.title}</span>`
          }
        </div>
      </section>
    </main>
  `;

  bindEvents();
}

function focusNextPlateField(current: HTMLInputElement): void {
  const plate = app.querySelector<HTMLElement>("[data-plate]");
  if (!plate) return;

  const inputs = [...plate.querySelectorAll<HTMLInputElement>("input")];
  const idx = inputs.indexOf(current);
  if (idx < 0 || idx >= inputs.length - 1) return;

  const maxLen = Number(current.maxLength) || 0;
  if (current.value.length >= maxLen) {
    inputs[idx + 1].focus();
    inputs[idx + 1].select();
  }
}

function bindEvents(): void {
  app.querySelectorAll<HTMLButtonElement>("[data-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.plateType = btn.dataset.type as PlateType;
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.diplomaticVariant = btn.dataset.variant as DiplomaticVariant;
      render();
    });
  });

  const plate = app.querySelector<HTMLElement>("[data-plate]");
  plate?.querySelectorAll<HTMLInputElement>("input").forEach((el, index) => {
    el.addEventListener("input", () => {
      handlePlateInput(el);
      focusNextPlateField(el);
      renderLookupOnly();
    });

    el.addEventListener("keydown", (e) => {
      if (e.key !== "Backspace" || el.value.length > 0) return;
      const inputs = [...plate.querySelectorAll<HTMLInputElement>("input")];
      if (index > 0) {
        e.preventDefault();
        inputs[index - 1].focus();
      }
    });
  });

  const first = plate?.querySelector<HTMLInputElement>("input");
  first?.focus();
}

function handlePlateInput(el: HTMLInputElement): void {
  const field = el.dataset.field;
  if (!field) return;

  switch (field) {
    case "series1":
      state.letter1 = sanitizeLetter(el.value) || "";
      el.value = state.letter1;
      break;
    case "digits3":
      state.digits3 = sanitizeDigit(el.value, 3);
      el.value = state.digits3;
      break;
    case "series2":
      state.series2 = sanitizeLetters(el.value, 2);
      el.value = state.series2;
      break;
    case "regionSlot": {
      const v = sanitizeDigit(el.value, 3);
      if (state.plateType === "civilian") state.region = v;
      else if (state.plateType === "military") state.milCode = v;
      else state.dipRegion = v;
      el.value = v;
      break;
    }
    case "milDigits4":
      state.milDigits4 = sanitizeDigit(el.value, 4);
      el.value = state.milDigits4;
      break;
    case "milLetters2":
      state.milLetters2 = sanitizeLetters(el.value, 2);
      el.value = state.milLetters2;
      break;
    case "dipCode":
      state.dipCode = sanitizeDigit(el.value, 3);
      el.value = state.dipCode;
      break;
  }
}

function renderLookupOnly(): void {
  const lookup = runLookup(getLookupCode());
  const box = app.querySelector(".lookup-result");
  if (!box) return;
  box.className = `lookup-result ${lookup.found ? "found" : lookup.detail ? "missing" : "muted"}`;
  box.innerHTML = lookup.detail
    ? `<span class="lookup-result__title">${lookup.title}</span><span class="lookup-result__detail">${lookup.detail}</span>`
    : `<span class="lookup-result__placeholder">${lookup.title}</span>`;
}

render();
