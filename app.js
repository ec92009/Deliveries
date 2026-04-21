const DATA_URL = "./data/deliveries.json";

const summaryGrid = document.querySelector("#summary-grid");
const lastUpdated = document.querySelector("#last-updated");
const timezone = document.querySelector("#timezone");
const panelTitle = document.querySelector("#panel-title");
const panelCount = document.querySelector("#panel-count");
const deliveryList = document.querySelector("#delivery-list");
const emptySuppliers = document.querySelector("#empty-suppliers");
const template = document.querySelector("#delivery-card-template");
const deliveriesTab = document.querySelector("#tab-deliveries");
const licensesTab = document.querySelector("#tab-licenses");

const supplierClassMap = {
  Amazon: "supplier-amazon",
  AliExpress: "supplier-aliexpress",
  Temu: "supplier-temu",
};

function formatDueDate(delivery) {
  if (!delivery.dueDate) {
    return "Expected date not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: delivery.timezone || "Europe/Madrid",
  }).format(new Date(`${delivery.dueDate}T12:00:00Z`));
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

function renderSummary(data) {
  const cards = [
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
    {
      label: "License entries",
      value: data.licenses.length,
      detail: "Digital products and subscriptions",
    },
  ];

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
    return;
  }

  for (const delivery of records) {
    const node = template.content.firstElementChild.cloneNode(true);
    const supplierTag = node.querySelector(".supplier-tag");
    const statusTag = node.querySelector(".status-tag");
    const title = node.querySelector(".delivery-title");
    const date = node.querySelector(".delivery-date");
    const notes = node.querySelector(".delivery-notes");
    const items = node.querySelector(".delivery-items");
    const links = node.querySelector(".delivery-links");

    supplierTag.textContent = config.tagLabel(delivery);
    supplierTag.classList.add(config.tagClass(delivery));
    statusTag.textContent = delivery.status;
    title.textContent = delivery.title;
    date.textContent = config.dateLabel(delivery);
    notes.textContent = delivery.notes;

    for (const item of delivery.items || []) {
      const pill = document.createElement("span");
      pill.className = "mini-pill";
      pill.textContent = item;
      items.appendChild(pill);
    }

    for (const link of delivery.links || []) {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      links.appendChild(anchor);
    }

    deliveryList.appendChild(node);
  }
}

function renderDeliveries(data) {
  renderCards(data.deliveries, {
    title: "Open deliveries",
    countLabel: (records) => `${records.length} open`,
    emptyMessage: "No pending deliveries right now.",
    tagLabel: (entry) => entry.supplier,
    tagClass: (entry) => supplierClassMap[entry.supplier] || "supplier-amazon",
    dateLabel: (entry) => formatDueDate(entry),
    sorter: compareDeliveries,
  });
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

function formatLicenseDate(license) {
  if (!license.nextDate) {
    return license.dateLabel || "No renewal date listed";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: license.timezone || "Europe/Madrid",
  }).format(new Date(`${license.nextDate}T12:00:00Z`));
}

function renderLicenses(data) {
  renderCards(data.licenses, {
    title: "Licenses and subscriptions",
    countLabel: (records) => `${records.length} tracked`,
    emptyMessage: "No license emails found yet.",
    tagLabel: (entry) => entry.service,
    tagClass: () => "supplier-aliexpress",
    dateLabel: (entry) => formatLicenseDate(entry),
    sorter: compareLicenses,
  });
}

function renderEmptySuppliers(data) {
  emptySuppliers.innerHTML = "";

  for (const supplier of data.emptySuppliers) {
    const card = document.createElement("div");
    card.className = "empty-card";
    card.textContent = `${supplier} has no pending deliveries in the latest refresh.`;
    emptySuppliers.appendChild(card);
  }
}

async function init() {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  const data = await response.json();

  lastUpdated.textContent = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: data.metadata.timezone,
  }).format(new Date(data.metadata.generatedAt));
  timezone.textContent = data.metadata.timezone;

  renderSummary(data);
  renderDeliveries(data);
  renderEmptySuppliers(data);

  deliveriesTab.addEventListener("click", () => {
    deliveriesTab.classList.add("is-active");
    deliveriesTab.setAttribute("aria-selected", "true");
    licensesTab.classList.remove("is-active");
    licensesTab.setAttribute("aria-selected", "false");
    renderDeliveries(data);
  });

  licensesTab.addEventListener("click", () => {
    licensesTab.classList.add("is-active");
    licensesTab.setAttribute("aria-selected", "true");
    deliveriesTab.classList.remove("is-active");
    deliveriesTab.setAttribute("aria-selected", "false");
    renderLicenses(data);
  });
}

init().catch((error) => {
  openCount.textContent = "Error";
  deliveryList.innerHTML = `<p class="empty-state">Failed to load delivery data: ${error.message}</p>`;
});
