import "./style.css";
import { DIPLOMATIC_CODES, lookupDiplomatic } from "./data/diplomatic";
import { MILITARY_CODES, lookupMilitary } from "./data/military";
import { REGIONS, lookupRegion } from "./data/regions";
import { PLATE_LETTERS, sanitizeDigit, sanitizeLetter, sanitizeLetters } from "./plate-letters";
import type { DiplomaticVariant, PlateType } from "./types";

interface State {
  plateType: PlateType;
  diplomaticVariant: DiplomaticVariant;
  showTables: boolean;
  tableTab: "regions" | "diplomatic" | "military";
  searchQuery: string;
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
  showTables: false,
  tableTab: "regions",
  searchQuery: "",
  letter1: "",
  digits3: "",
  series2: "",
  region: "",
  milDigits4: "",
  milLetters2: "",
  milCode: "",
  dipCode: "",
  dipRegion: "",
};

const appElement = document.getElementById("app");
if (!appElement) throw new Error("#app not found");
const app: HTMLElement = appElement;

// Toggle to control automatic focusing/selecting of plate inputs.
// Set to `false` to disable auto-focus/auto-select behavior.
const AUTO_FOCUS = false;
const FOOTER_DATE = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
}).format(new Date());

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDigits(length: number): string {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += Math.floor(Math.random() * 10).toString();
  }
  return value;
}

function randomPlateLetters(length: number): string {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += randomItem(PLATE_LETTERS);
  }
  return value;
}

function randomizePlateDefaults(type: PlateType): void {
  if (type === "civilian") {
    state.letter1 = randomPlateLetters(1);
    state.digits3 = randomDigits(3);
    state.series2 = randomPlateLetters(2);
    state.region = "";
    return;
  }

  if (type === "military") {
    state.milDigits4 = randomDigits(4);
    state.milLetters2 = randomPlateLetters(2);
    state.milCode = "";
  }
}

randomizePlateDefaults(state.plateType);

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

interface SearchEntry {
  code: string;
  name: string;
}

function getSearchConfig(): { label: string; placeholder: string } {
  if (state.plateType === "civilian") {
    return { label: "Поиск региона", placeholder: "Поиск" };
  }

  if (state.plateType === "military") {
    return { label: "Поиск военного кода", placeholder: "Поиск" };
  }

  return { label: "Поиск страны", placeholder: "Поиск" };
}

function getSearchEntries(): SearchEntry[] {
  if (state.plateType === "civilian") {
    return Object.entries(REGIONS).map(([code, name]) => ({ code, name }));
  }

  if (state.plateType === "military") {
    return Object.entries(MILITARY_CODES).map(([code, name]) => ({ code, name }));
  }

  return Object.entries(DIPLOMATIC_CODES).map(([code, name]) => ({ code, name }));
}

function getSearchResults(query: string): SearchEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const needle = trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, "");

  const ranked = getSearchEntries()
    .map((entry) => {
      let score = 0;
      if (digits) {
        if (entry.code === digits) score = 100;
        else if (entry.code.startsWith(digits)) score = 80;
        else if (entry.code.includes(digits)) score = 30;
      }

      if (!score) {
        const name = entry.name.toLowerCase();
        if (name.startsWith(needle)) score = 70;
        else if (name.includes(needle)) score = 50;
      }

      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.code.localeCompare(right.entry.code));

  return ranked.slice(0, 6).map((item) => item.entry);
}

function getSearchResultsHTML(entries: SearchEntry[], hasQuery: boolean): string {
  if (entries.length === 0) {
    return hasQuery ? `<div class="search-empty">Ничего не найдено</div>` : "";
  }

  return entries
    .map(
      (entry) => `
      <button
        type="button"
        class="search-result"
        data-search-code="${escapeAttr(entry.code)}"
        data-search-name="${escapeAttr(entry.name)}"
      >
        <span class="search-result__code">${escapeAttr(entry.code)}</span>
        <span class="search-result__name">${escapeAttr(entry.name)}</span>
      </button>
    `,
    )
    .join("");
}

function applySearchSelection(entry: SearchEntry): void {
  if (state.plateType === "civilian") {
    state.region = sanitizeDigit(entry.code, 3);
  } else if (state.plateType === "military") {
    state.milCode = sanitizeDigit(entry.code, 3);
  } else {
    state.dipCode = sanitizeDigit(entry.code, 3);
  }

  state.searchQuery = "";
  render();
}

function renderSearch(): string {
  const { label, placeholder } = getSearchConfig();
  const results = getSearchResults(state.searchQuery);
  const hasQuery = state.searchQuery.trim().length > 0;

  return `
    <div class="search-bar">
      <label class="sr-only" for="plate-search">${escapeAttr(label)}</label>
      <div class="search-row">
        <div class="search-input-wrap">
          <span class="search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path
                d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-2a9 9 0 1 0 5.58 16.06l4.18 4.18a1 1 0 0 0 1.42-1.42l-4.18-4.18A9 9 0 0 0 11 2Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            id="plate-search"
            class="search-input"
            type="search"
            placeholder="${escapeAttr(placeholder)}"
            value="${escapeAttr(state.searchQuery)}"
            data-search=""
            autocomplete="off"
          />
        </div>
        <button type="button" class="tables-btn" data-view="tables" aria-label="Справочные таблицы">
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path
              d="M5 6h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2Zm0 5h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2Zm0 5h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <div class="search-results" data-search-results="" role="listbox" aria-label="Результаты поиска">
        ${getSearchResultsHTML(results, hasQuery)}
      </div>
    </div>
  `;
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
      ${plateInput("number", "digits3", state.digits3, 3, "000")}
      ${plateInput("series2", "series2", state.series2, 2, "AA")}
    `;
  }

  if (state.plateType === "military") {
    return `
      ${plateInput("digits4", "milDigits4", state.milDigits4, 4, "0000")}
      ${plateInput("letters2", "milLetters2", state.milLetters2, 2, "AA")}
    `;
  }

  const code = plateInput("dip-code", "dipCode", state.dipCode, 3, "000");

  if (state.diplomaticVariant === "ambassador") {
    return `${code}<span class="plate-static">CD</span><span class="plate-static">1</span>`;
  }

  const status = state.diplomaticVariant === "diplomat" ? "D" : "T";
  return `${code}<span class="plate-static">${status}</span><span class="plate-static">001</span>`;
}

function renderPlate(): string {
  const regionValue =
    state.plateType === "civilian"
      ? state.region
      : state.plateType === "military"
        ? state.milCode
        : state.dipRegion;

  const regionPlaceholder =
    state.plateType === "military" ? "00" : "00";

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
  const typeLabels: Record<PlateType, string> = {
    civilian: "Обычные",
    diplomatic: "Дипломатические",
    military: "Военные",
  };

  const plateView = `
      <section class="plate-section">
        ${renderSearch()}
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
        ${getInfoTableHTML()}
      </section>
  `;

  const tablesOverlay = state.showTables
    ? `
      <div class="tables-overlay" role="dialog" aria-modal="true" aria-label="Справочные таблицы">
        <div class="tables-overlay__backdrop" data-close-tables=""></div>
        <div class="tables-overlay__panel">
          <div class="tables-overlay__header">
            <h2>Справочные таблицы</h2>
            <button type="button" class="close-btn" data-close-tables="" aria-label="Закрыть">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path
                  d="M6.4 5.3a1 1 0 0 1 1.4 0L12 9.6l4.2-4.3a1 1 0 1 1 1.4 1.4L13.4 11l4.2 4.3a1 1 0 0 1-1.4 1.4L12 12.4l-4.2 4.3a1 1 0 1 1-1.4-1.4L10.6 11 6.4 6.7a1 1 0 0 1 0-1.4Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
          <div class="tables-overlay__body">
            <nav class="tables-tabs" aria-label="Разделы таблиц">
              <button type="button" class="tab-btn ${state.tableTab === "regions" ? "active" : ""}" data-table-tab="regions">Регионы</button>
              <button type="button" class="tab-btn ${state.tableTab === "diplomatic" ? "active" : ""}" data-table-tab="diplomatic">Дипломатические</button>
              <button type="button" class="tab-btn ${state.tableTab === "military" ? "active" : ""}" data-table-tab="military">Военные</button>
            </nav>
            ${renderTablesView()}
          </div>
        </div>
      </div>
    `
    : "";

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
      ${plateView}
    </main>

    ${tablesOverlay}

    <footer class="app-footer" aria-label="Credits">
      <span><a href="https://github.com/rfeskov" target="_blank" rel="noopener noreferrer">rfeskov</a></span>
      <span>•</span>
      <span>${FOOTER_DATE}</span>
    </footer>
  `;

  bindEvents();
}

function getInfoTableHTML(): string {
  const rows: string[] = [];

  if (state.plateType === "diplomatic") {
    const rawCode = state.dipCode.trim();
    if (rawCode) {
      const code = rawCode.padStart(3, "0").slice(-3);
      const country = lookupDiplomatic(code);
      rows.push(`<tr><td class="code">${escapeAttr(code)}</td><td class="desc">${escapeAttr(country ?? "Код не найден")}</td></tr>`);
    }

    const regionCode = state.dipRegion.trim();
    const regionName = lookupRegion(regionCode);
    if (regionCode) {
      const regionDesc = regionName ? regionName : `Код ${regionCode} не найден`;
      rows.push(`<tr><td class="code">${escapeAttr(regionCode)}</td><td class="desc">${escapeAttr(regionDesc)}</td></tr>`);
    }

    const variantLabel = state.diplomaticVariant === "ambassador" ? "CD" : state.diplomaticVariant === "diplomat" ? "D" : "T";
    const variantDesc = state.diplomaticVariant === "ambassador"
      ? "Глава дипломатической миссии (посол)"
      : state.diplomaticVariant === "diplomat"
        ? "Дипломатический персонал"
        : "Технический персонал";
    rows.push(`<tr><td class="code">${variantLabel}</td><td class="desc">${variantDesc}</td></tr>`);
  } else if (state.plateType === "civilian") {
    const regionCode = state.region.trim();
    const regionName = lookupRegion(regionCode);
    if (regionCode) {
      const regionDesc = regionName ? regionName : `Код ${regionCode} не найден`;
      rows.push(`<tr><td class="code">${escapeAttr(regionCode)}</td><td class="desc">${escapeAttr(regionDesc)}</td></tr>`);
    }
  } else if (state.plateType === "military") {
    const code = state.milCode.trim();
    const name = lookupMilitary(code);
    if (code) {
      const nameDesc = name ? name : `Код ${code} не найден`;
      rows.push(`<tr><td class="code">${escapeAttr(code)}</td><td class="desc">${escapeAttr(nameDesc)}</td></tr>`);
    }
  }

  if (rows.length === 0) {
    return `<div class="lookup-result muted"><span class="lookup-result__placeholder">Введите код</span></div>`;
  }

  return `<table class="info-table">${rows.join("")}</table>`;
}

function sortEntries(entries: Array<[string, string]>): Array<[string, string]> {
  return [...entries].sort((left, right) => Number(left[0]) - Number(right[0]));
}

function getMilitaryTableRows(): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const entries = sortEntries(Object.entries(MILITARY_CODES));

  let currentLabel: string | null = null;
  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;

  const flushRange = (): void => {
    if (currentLabel === null || rangeStart === null || rangeEnd === null) return;
    const start = rangeStart.toString().padStart(2, "0");
    const end = rangeEnd.toString().padStart(2, "0");
    const label = rangeEnd > rangeStart && currentLabel === "Резервный код"
      ? "Резервные коды"
      : currentLabel;
    if (rangeStart === rangeEnd) {
      rows.push([start, label]);
    } else if (rangeEnd - rangeStart === 1) {
      rows.push([`${start}, ${end}`, label]);
    } else {
      rows.push([`${start}–${end}`, label]);
    }
    currentLabel = null;
    rangeStart = null;
    rangeEnd = null;
  };

  for (const [code, name] of entries) {
    const numeric = Number(code);
    if (currentLabel === name && rangeEnd !== null && numeric === rangeEnd + 1) {
      rangeEnd = numeric;
      continue;
    }

    flushRange();
    currentLabel = name;
    rangeStart = numeric;
    rangeEnd = numeric;
  }

  flushRange();
  return rows;
}

function getRegionTableRows(): Array<[string, string]> {
  const grouped = new Map<string, string[]>();
  for (const [code, name] of Object.entries(REGIONS)) {
    const existing = grouped.get(name);
    if (existing) {
      existing.push(code);
    } else {
      grouped.set(name, [code]);
    }
  }

  const rows: Array<[string, string]> = [];
  for (const [name, codes] of grouped.entries()) {
    const sorted = codes.sort((left, right) => Number(left) - Number(right));
    rows.push([sorted.join(", "), name]);
  }

  return rows.sort((left, right) => Number(left[0].split(", ")[0]) - Number(right[0].split(", ")[0]));
}

function renderDataTable(title: string, rows: Array<[string, string]>, className: string): string {
  return `
    <section class="data-table-card ${className}">
      <h2>${escapeAttr(title)}</h2>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr><th>Код</th><th>Значение</th></tr>
          </thead>
          <tbody>
            ${rows.map(([code, name]) => `<tr><td>${escapeAttr(code)}</td><td>${escapeAttr(name)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTablesView(): string {
  if (state.tableTab === "diplomatic") {
    return renderDataTable("Дипломатические коды", sortEntries(Object.entries(DIPLOMATIC_CODES)), "data-table-card--diplomatic");
  }

  if (state.tableTab === "military") {
    return renderDataTable("Военные коды", getMilitaryTableRows(), "data-table-card--military");
  }

  return renderDataTable("Регионы и субъекты", getRegionTableRows(), "data-table-card--regions");
}

function focusNextPlateField(current: HTMLInputElement): void {
  const plate = app.querySelector<HTMLElement>("[data-plate]");
  if (!plate) return;

  const inputs = [...plate.querySelectorAll<HTMLInputElement>("input")];
  const idx = inputs.indexOf(current);
  if (idx < 0 || idx >= inputs.length - 1) return;

  const maxLen = Number(current.maxLength) || 0;
  if (current.value.length >= maxLen) {
    if (AUTO_FOCUS) {
      inputs[idx + 1].focus();
      inputs[idx + 1].select();
    } else {
      inputs[idx + 1].focus();
    }
  }
}

function bindEvents(): void {
  app.querySelectorAll<HTMLButtonElement>("[data-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.plateType = btn.dataset.type as PlateType;
      state.showTables = false;
      state.searchQuery = "";
      if (state.plateType === "civilian" || state.plateType === "military") {
        randomizePlateDefaults(state.plateType);
      }
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.view === "tables") {
        const shouldOpen = !state.showTables;
        if (shouldOpen) {
          state.tableTab = state.plateType === "civilian" ? "regions" : state.plateType;
        }
        state.showTables = shouldOpen;
        render();
      }
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-close-tables]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.showTables = false;
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-table-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tableTab as State["tableTab"] | undefined;
      if (!tab) return;
      state.tableTab = tab;
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.diplomaticVariant = btn.dataset.variant as DiplomaticVariant;
      render();
    });
  });

  const searchInput = app.querySelector<HTMLInputElement>("[data-search]");
  const searchResults = app.querySelector<HTMLElement>("[data-search-results]");

  searchInput?.addEventListener("input", () => {
    state.searchQuery = searchInput.value;
    const results = getSearchResults(state.searchQuery);
    const hasQuery = state.searchQuery.trim().length > 0;
    if (searchResults) {
      searchResults.innerHTML = getSearchResultsHTML(results, hasQuery);
    }
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const results = getSearchResults(searchInput.value);
    if (results[0]) {
      event.preventDefault();
      applySearchSelection(results[0]);
    }
  });

  searchResults?.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-search-code]");
    if (!target) return;
    const code = target.dataset.searchCode ?? "";
    const name = target.dataset.searchName ?? "";
    if (!code || !name) return;
    applySearchSelection({ code, name });
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
  if (AUTO_FOCUS) first?.focus();
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
  // Keep existing lookup helpers referenced so TypeScript won't mark them unused.
  void runLookup(getLookupCode());

  const section = app.querySelector(".lookup-section");
  if (!section) return;
  section.innerHTML = getInfoTableHTML();
}

render();
