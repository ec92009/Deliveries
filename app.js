const DATA_URL = "./data/deliveries.json";

const summaryGrid = document.querySelector("#summary-grid");
const lastUpdated = document.querySelector("#last-updated");
const timezone = document.querySelector("#timezone");
const openCount = document.querySelector("#open-count");
const deliveryList = document.querySelector("#delivery-list");
const emptySuppliers = document.querySelector("#empty-suppliers");
const template = document.querySelector("#delivery-card-template");

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

function renderDeliveries(data) {
  const deliveries = [...data.deliveries].sort(compareDeliveries);
  openCount.textContent = `${deliveries.length} open`;
  deliveryList.innerHTML = "";

  if (!deliveries.length) {
    deliveryList.innerHTML = '<p class="empty-state">No pending deliveries right now.</p>';
    return;
  }

  for (const delivery of deliveries) {
    const node = template.content.firstElementChild.cloneNode(true);
    const supplierTag = node.querySelector(".supplier-tag");
    const statusTag = node.querySelector(".status-tag");
    const title = node.querySelector(".delivery-title");
    const date = node.querySelector(".delivery-date");
    const notes = node.querySelector(".delivery-notes");
    const items = node.querySelector(".delivery-items");
    const links = node.querySelector(".delivery-links");

    supplierTag.textContent = delivery.supplier;
    supplierTag.classList.add(supplierClassMap[delivery.supplier] || "supplier-amazon");
    statusTag.textContent = delivery.status;
    title.textContent = delivery.title;
    date.textContent = formatDueDate(delivery);
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
}

init().catch((error) => {
  openCount.textContent = "Error";
  deliveryList.innerHTML = `<p class="empty-state">Failed to load delivery data: ${error.message}</p>`;
});
