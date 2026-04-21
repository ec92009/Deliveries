const DATA_URL = "./data/deliveries.json";

const summaryGrid = document.querySelector("#summary-grid");
const lastUpdated = document.querySelector("#last-updated");
const appVersion = document.querySelector("#app-version");
const timezone = document.querySelector("#timezone");
const panelTitle = document.querySelector("#panel-title");
const panelCount = document.querySelector("#panel-count");
const deliveryList = document.querySelector("#delivery-list");
const emptySuppliers = document.querySelector("#empty-suppliers");
const emptySuppliersPanel = document.querySelector("#empty-suppliers-panel");
const template = document.querySelector("#delivery-card-template");
const deliveriesTab = document.querySelector("#tab-deliveries");
const licensesTab = document.querySelector("#tab-licenses");
const subscriptionsTab = document.querySelector("#tab-subscriptions");

const supplierClassMap = {
  Amazon: "supplier-amazon",
  AliExpress: "supplier-aliexpress",
  Temu: "supplier-temu",
};

const modeButtons = {
  deliveries: deliveriesTab,
  licenses: licensesTab,
  subscriptions: subscriptionsTab,
};

function formatCalendarDate(date, zone = "Europe/Madrid") {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: zone,
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatDueDate(delivery) {
  if (!delivery.dueDate) {
    return "Expected date not available";
  }

  return formatCalendarDate(delivery.dueDate, delivery.timezone);
}

function compareDeliveries(a, b) {
  if (a.dueDate && b.dueDate) {
    return a.dueDate.localeCompare(b.dueDate);
  }

  if (a.dueDate) {
    return -1;
  }

  if (b.dueDate) {
    return 1;
  }

  return a.supplier.localeCompare(b.supplier) || a.title.localeCompare(b.title);
}

function compareLicenses(a, b) {
  if (a.nextDate && b.nextDate) {
    return a.nextDate.localeCompare(b.nextDate);
  }

  if (a.nextDate) {
    return -1;
  }

  if (b.nextDate) {
    return 1;
  }

  return a.title.localeCompare(b.title);
}

function differenceInDays(targetDate, today) {
  const start = new Date(`${today}T12:00:00Z`);
  const end = new Date(`${targetDate}T12:00:00Z`);
  return Math.round((end - start) / 86400000);
}

function getLicenseWarning(license, today) {
  if (!license.nextDate || license.renewalState === "canceled" || license.renewalState === "one_time") {
    return null;
  }

  const windowDays = license.warningWindowDays ?? 7;
  const daysUntil = differenceInDays(license.nextDate, today);

  if (daysUntil < 0) {
    return { label: "Past due", priority: "warning" };
  }

  if (daysUntil <= windowDays) {
    if (daysUntil === 0) {
      return { label: "Renews today", priority: "warning" };
    }

    if (daysUntil === 1) {
      return { label: "Renews tomorrow", priority: "warning" };
    }

    return { label: `Renews in ${daysUntil} days`, priority: "warning" };
  }

  return null;
}

function formatLicenseDate(license) {
  if (!license.nextDate) {
    return license.dateLabel || "No renewal date listed";
  }

  return formatCalendarDate(license.nextDate, license.timezone);
}

function normalizeData(data) {
  const explicitLicenses = Array.isArray(data.licenses) ? data.licenses : [];
  const explicitSubscriptions = Array.isArray(data.subscriptions) ? data.subscriptions : [];

  if (explicitSubscriptions.length) {
    return {
      ...data,
      licenses: explicitLicenses,
      subscriptions: explicitSubscriptions,
    };
  }

  const licenses = [];
  const subscriptions = [];

  for (const entry of explicitLicenses) {
    if (entry.renewalState === "one_time") {
      licenses.push(entry);
      continue;
    }

    subscriptions.push(entry);
  }

  return {
    ...data,
    licenses,
    subscriptions,
  };
}

function renderSummary(cards) {
  summaryGrid.innerHTML = "";

  for (const card of cards) {
    const node = document.createElement("article");
    node.className = "summary-card";
    node.innerHTML = `
      <span class="meta-label">${card.label}</span>
      <strong>${card.value}</strong>
      <span>${card.detail}</span>
    `;
    summaryGrid.appendChild(node);
  }
}

function renderCards(entries, config) {
  const records = [...entries].sort(config.sorter);
  deliveryList.innerHTML = "";

  panelTitle.textContent = config.title;
  panelCount.textContent = config.countLabel(records);

  if (!records.length) {
    deliveryList.innerHTML = `<p class="empty-copy">${config.emptyMessage}</p>`;
    return records;
  }

  for (const entry of records) {
    const node = template.content.firstElementChild.cloneNode(true);
    const supplierTag = node.querySelector(".supplier-tag");
    const statusTag = node.querySelector(".status-tag");
    const title = node.querySelector(".delivery-title");
    const date = node.querySelector(".delivery-date");
    const notes = node.querySelector(".delivery-notes");
    const items = node.querySelector(".delivery-items");
    const links = node.querySelector(".delivery-links");

    supplierTag.textContent = config.tagLabel(entry);
    supplierTag.classList.add(config.tagClass(entry));
    statusTag.textContent = entry.status;
    title.textContent = entry.title;
    date.textContent = config.dateLabel(entry);
    notes.textContent = entry.notes;

    for (const item of entry.items || []) {
      const pill = document.createElement("span");
      pill.className = "mini-pill";
      pill.textContent = item;
      items.appendChild(pill);
    }

    for (const link of entry.links || []) {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      links.appendChild(anchor);
    }

    deliveryList.appendChild(node);
  }

  return records;
}

function renderEmptySuppliers(data, isVisible) {
  emptySuppliersPanel.classList.toggle("is-hidden", !isVisible);

  if (!isVisible) {
    return;
  }

  emptySuppliers.innerHTML = "";

  for (const supplier of data.emptySuppliers) {
    const card = document.createElement("div");
    card.className = "empty-card";
    card.textContent = `${supplier} has no pending deliveries in the latest refresh.`;
    emptySuppliers.appendChild(card);
  }
}

function getModeConfig(mode, data) {
  if (mode === "licenses") {
    return {
      summary: [
        {
          label: "Tracked licenses",
          value: data.licenses.length,
          detail: "One-time digital purchases and download entitlements",
        },
        {
          label: "With account links",
          value: data.licenses.filter((entry) => (entry.links || []).length > 0).length,
          detail: "Entries with a direct download or account page",
        },
        {
          label: "No renewal date",
          value: data.licenses.filter((entry) => !entry.nextDate).length,
          detail: "One-time items that are not expected to auto-renew",
        },
      ],
      panel: {
        entries: data.licenses,
        title: "License access",
        countLabel: (records) => `${records.length} tracked`,
        emptyMessage: "No one-time license emails found yet.",
        tagLabel: (entry) => entry.service,
        tagClass: () => "supplier-aliexpress",
        dateLabel: (entry) => formatLicenseDate(entry),
        sorter: compareLicenses,
      },
      showEmptySuppliers: false,
    };
  }

  if (mode === "subscriptions") {
    return {
      summary: [
        {
          label: "Tracked subscriptions",
          value: data.subscriptions.length,
          detail: "Recurring plans with billing or access-end state",
        },
        {
          label: "Renewing within a week",
          value: data.subscriptions.filter((entry) => getLicenseWarning(entry, data.today)).length,
          detail: "Renewals landing inside the warning window",
        },
        {
          label: "Canceled at period end",
          value: data.subscriptions.filter((entry) => entry.renewalState === "canceled").length,
          detail: "Plans that will not renew automatically",
        },
        {
          label: "Still active",
          value: data.subscriptions.filter((entry) => entry.renewalState === "active").length,
          detail: "Auto-renewing subscriptions still in effect",
        },
      ],
      panel: {
        entries: data.subscriptions,
        title: "Subscriptions",
        countLabel: (records) => {
          const warningCount = records.filter((record) => getLicenseWarning(record, data.today)).length;
          return warningCount ? `${warningCount} warning${warningCount === 1 ? "" : "s"}` : `${records.length} tracked`;
        },
        emptyMessage: "No subscription emails found yet.",
        tagLabel: (entry) => entry.service,
        tagClass: () => "supplier-aliexpress",
        dateLabel: (entry) => formatLicenseDate(entry),
        sorter: compareLicenses,
      },
      warningMode: true,
      showEmptySuppliers: false,
    };
  }

  return {
    summary: [
      {
        label: "Pending deliveries",
        value: data.deliveries.length,
        detail: "Across all tracked suppliers",
      },
      {
        label: "Due today",
        value: data.deliveries.filter((item) => item.dueDate === data.today).length,
        detail: "Anything expected today goes first",
      },
      {
        label: "Suppliers with open deliveries",
        value: new Set(data.deliveries.map((item) => item.supplier)).size,
        detail: "Only suppliers with something pending",
      },
      {
        label: "No pending deliveries",
        value: data.emptySuppliers.length,
        detail: "Tracked suppliers currently clear",
      },
    ],
    panel: {
      entries: data.deliveries,
      title: "Open deliveries",
      countLabel: (records) => `${records.length} open`,
      emptyMessage: "No pending deliveries right now.",
      tagLabel: (entry) => entry.supplier,
      tagClass: (entry) => supplierClassMap[entry.supplier] || "supplier-amazon",
      dateLabel: (entry) => formatDueDate(entry),
      sorter: compareDeliveries,
    },
    showEmptySuppliers: true,
  };
}

function decorateWarnings(records, today, enabled) {
  if (!enabled) {
    return;
  }

  const cards = [...deliveryList.querySelectorAll(".delivery-card")];

  for (const [index, entry] of records.entries()) {
    const warning = getLicenseWarning(entry, today);
    if (!warning) {
      continue;
    }

    const card = cards[index];
    const statusTag = card?.querySelector(".status-tag");
    if (statusTag) {
      statusTag.textContent = warning.label;
      statusTag.classList.add("status-warning");
    }
  }
}

function setActiveMode(mode, data) {
  for (const [name, button] of Object.entries(modeButtons)) {
    const isActive = name === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  }

  const config = getModeConfig(mode, data);
  renderSummary(config.summary);
  const records = renderCards(config.panel.entries, config.panel);
  decorateWarnings(records, data.today, config.warningMode);
  renderEmptySuppliers(data, config.showEmptySuppliers);
}

async function init() {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  const data = normalizeData(await response.json());

  lastUpdated.textContent = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: data.metadata.timezone,
  }).format(new Date(data.metadata.generatedAt));

  if (appVersion) {
    appVersion.textContent = data.metadata.version || "Unversioned";
  }

  if (timezone) {
    timezone.textContent = data.metadata.timezone;
  }

  setActiveMode("deliveries", data);

  deliveriesTab.addEventListener("click", () => setActiveMode("deliveries", data));
  licensesTab.addEventListener("click", () => setActiveMode("licenses", data));
  subscriptionsTab.addEventListener("click", () => setActiveMode("subscriptions", data));
}

init().catch((error) => {
  panelTitle.textContent = "Open deliveries";
  panelCount.textContent = "Error";
  deliveryList.innerHTML = `<p class="empty-copy">Failed to load delivery data: ${error.message}</p>`;
});
