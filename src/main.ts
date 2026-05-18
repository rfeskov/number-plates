import "./style.css";
import { lookupDiplomatic } from "./data/diplomatic";
import { lookupMilitary } from "./data/military";
import { lookupRegion } from "./data/regions";
import {
  PLATE_LETTERS,
  sanitizeDigit,
  sanitizeLetter,
  sanitizeLetters,
} from "./plate-letters";
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
  lookupInput: string;
}

const state: State = {
  plateType: "civilian",
  diplomaticVariant: "ambassador",
  letter1: "А",
  digits3: "123",
  series2: "ВС",
  region: "77",
  milDigits4: "1234",
  milLetters2: "АВ",
  milCode: "77",
  dipCode: "004",
  dipRegion: "77",
  lookupInput: "",
};

const appElement = document.getElementById("app");
if (!appElement) throw new Error("#app not found");
const app: HTMLElement = appElement;

function formatHints(): Record<PlateType, string> {
  return {
    civilian: "<code>Буква 000 ББ YY</code> — буквы из набора АВЕКМНОРСТУХ, YY/YYY — код субъекта РФ",
    military:
      "<code>0000 ББ YY</code> — YY — код военного округа или ведомства, не регион",
    diplomatic:
      state.diplomaticVariant === "ambassador"
        ? "<code>ZZZ CD 0 YY</code> — глава дипмиссии (CD)"
        : state.diplomaticVariant === "diplomat"
          ? "<code>ZZZ D 000 YY</code> — дипломатический статус (D)"
          : "<code>ZZZ T 000 YY</code> — административный персонал (T)",
  };
}

function lookupLabel(): string {
  switch (state.plateType) {
    case "civilian":
      return "Код региона";
    case "military":
      return "Код подразделения";
    case "diplomatic":
      return "Код страны / организации";
  }
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
      ? `Регион ${state.dipRegion} не найден в базе`
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
    detail: [`Код «${normalized}» — добавьте в src/data/diplomatic.ts`, regionLine]
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
          detail: `Код «${trimmed}» отсутствует в базе. Можно добавить в src/data/regions.ts`,
        };
  }

  if (state.plateType === "military") {
    const name = lookupMilitary(trimmed);
    return name
      ? { found: true, title: name, detail: `Код ${trimmed}` }
      : {
          found: false,
          title: "Код не найден",
          detail: `Код «${trimmed}» — добавьте расшифровку в src/data/military.ts`,
        };
  }

  return runDiplomaticLookup(trimmed);
}

function syncLookupFromPlate(): void {
  if (state.plateType === "civilian") {
    state.lookupInput = state.region;
  } else if (state.plateType === "military") {
    state.lookupInput = state.milCode;
  } else if (state.plateType === "diplomatic") {
    state.lookupInput = state.dipCode;
  }
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

  const code = plateInput("dip-code", "dipCode", state.dipCode, 3, "004");

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
  const lookup = runLookup(state.lookupInput);
  const typeLabels: Record<PlateType, string> = {
    civilian: "Обычные",
    diplomatic: "Дипломатические",
    military: "Военные",
  };

  app.innerHTML = `
    <header>
      <h1>Российские госномера</h1>
      <p>Форматы, расшифровка регионов и кодов</p>
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

    <section class="plate-section">
      <div class="plate-wrap">
        ${renderPlate()}
      </div>
      <p class="format-hint">${formatHints()[state.plateType]}</p>
    </section>

    ${
      state.plateType === "diplomatic"
        ? `
    <section class="panel">
      <h2>Вариант дипломатического номера</h2>
      <div class="diplomatic-variants">
        <button type="button" class="variant-btn ${state.diplomaticVariant === "ambassador" ? "active" : ""}" data-variant="ambassador">Глава миссии (CD)</button>
        <button type="button" class="variant-btn ${state.diplomaticVariant === "diplomat" ? "active" : ""}" data-variant="diplomat">Дипломат (D)</button>
        <button type="button" class="variant-btn ${state.diplomaticVariant === "staff" ? "active" : ""}" data-variant="staff">Персонал (T)</button>
      </div>
      <p class="letters-note">Допустимые буквы на обычных номерах: <span>${PLATE_LETTERS.join(" ")}</span></p>
    </section>
    `
        : state.plateType === "civilian"
          ? `
    <section class="panel">
      <p class="letters-note">Допустимые буквы: <span>${PLATE_LETTERS.join(" ")}</span> (кириллица, похожая на латиницу)</p>
    </section>
    `
          : ""
    }

    <section class="panel">
      <h2>Расшифровка</h2>
      <p>Измените код на номере или введите его ниже. ${
        state.plateType === "military"
          ? "На военных номерах правые цифры — не регион."
          : state.plateType === "diplomatic"
            ? "Слева — код страны или организации, справа — регион (2 или 3 цифры)."
            : "Правые цифры — код субъекта РФ (2 или 3 знака)."
      }</p>
      <div class="lookup-row">
        <div class="lookup-field">
          <label for="lookup-input">${lookupLabel()}</label>
          <input id="lookup-input" type="text" inputmode="numeric" value="${escapeAttr(state.lookupInput)}" maxlength="3" />
        </div>
      </div>
      <div class="lookup-result ${lookup.found ? "found" : lookup.detail ? "missing" : "muted"}">
        ${
          lookup.detail
            ? `<strong>${lookup.title}</strong><br>${lookup.detail}`
            : `<span class="muted">${lookup.title}</span>`
        }
      </div>
    </section>
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
      syncLookupFromPlate();
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.diplomaticVariant = btn.dataset.variant as DiplomaticVariant;
      syncLookupFromPlate();
      render();
    });
  });

  const lookupEl = app.querySelector<HTMLInputElement>("#lookup-input");
  lookupEl?.addEventListener("input", () => {
    state.lookupInput = lookupEl.value.replace(/\D/g, "").slice(0, 3);
    lookupEl.value = state.lookupInput;
    applyLookupToPlate();
    updatePlateInputs();
    renderLookupOnly();
  });

  const plate = app.querySelector<HTMLElement>("[data-plate]");
  plate?.querySelectorAll<HTMLInputElement>("input").forEach((el, index) => {
    el.addEventListener("input", () => {
      handlePlateInput(el);
      focusNextPlateField(el);
      const field = el.dataset.field;
      if (state.plateType === "diplomatic" && field === "regionSlot") {
        renderLookupOnly();
        return;
      }
      syncLookupFromPlate();
      if (lookupEl) lookupEl.value = state.lookupInput;
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

function applyLookupToPlate(): void {
  if (state.plateType === "civilian") state.region = state.lookupInput;
  else if (state.plateType === "military") state.milCode = state.lookupInput;
  else if (state.plateType === "diplomatic") {
    state.dipCode = state.lookupInput.padStart(3, "0").slice(-3);
  }
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

function updatePlateInputs(): void {
  const plate = app.querySelector<HTMLElement>("[data-plate]");
  if (!plate) return;

  const set = (field: string, value: string) => {
    const el = plate.querySelector<HTMLInputElement>(`[data-field="${field}"]`);
    if (el) el.value = value;
  };

  set("regionSlot", state.plateType === "civilian" ? state.region : state.plateType === "military" ? state.milCode : state.dipRegion);
  if (state.plateType === "diplomatic") {
    set("dipCode", state.dipCode);
  }
}

function renderLookupOnly(): void {
  const lookup = runLookup(state.lookupInput);
  const box = app.querySelector(".lookup-result");
  if (!box) return;
  box.className = `lookup-result ${lookup.found ? "found" : lookup.detail ? "missing" : "muted"}`;
  box.innerHTML = lookup.detail
    ? `<strong>${lookup.title}</strong><br>${lookup.detail}`
    : `<span class="muted">${lookup.title}</span>`;
}

syncLookupFromPlate();
render();
