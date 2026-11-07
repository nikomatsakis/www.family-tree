import { matchingItems } from "./citation-search.mjs";
import { getDocument, GlobalWorkerOptions, TextLayer } from "/pdfjs/pdf.mjs";
GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.mjs";
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.hash.slice(1));
const source = params.get("source") || "pages";
let pageNumber = Number(params.get("page")) || 1;
let pdf,
  metadata,
  originalUrl,
  renderVersion = 0;
$("name").value = params.get("name") || "";
const decode = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function readSource() {
  if (!/^[a-z0-9-]+$/.test(source))
    throw new Error("Invalid reference source.");
  const publicResponse = await fetch(`/reference-material/${source}.json`);
  if (
    publicResponse.ok &&
    publicResponse.headers.get("content-type")?.includes("json")
  )
    return publicResponse.json();
  const response = await fetch(`/api/v1/source-${source}.json.enc`);
  if (!response.ok)
    throw new Error("This reference document is not configured.");
  const password = localStorage.getItem("familyTreePassword");
  if (!password) {
    $("unlock").hidden = false;
    throw new Error("Enter the family tree password to open this document.");
  }
  const envelope = await response.json();
  try {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: decode(envelope.salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      material,
      { name: "AES-CBC", length: 256 },
      false,
      ["decrypt"],
    );
    const bytes = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: decode(envelope.iv) },
      key,
      decode(envelope.data),
    );
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    $("unlock").hidden = false;
    throw new Error(
      "Could not unlock the document. Please check the password.",
    );
  }
}

async function render() {
  const version = ++renderVersion;
  pageNumber = Math.max(1, Math.min(pdf.numPages, Math.trunc(pageNumber) || 1));
  $("status").textContent = "Loading page…";
  $("page").value = pageNumber;
  $("original").href = `${originalUrl}#page=${pageNumber}`;
  $("previous").disabled = pageNumber === 1;
  $("next").disabled = pageNumber === pdf.numPages;
  params.set("page", pageNumber - (metadata.pageOffset || 0));
  params.set("name", $("name").value);
  history.replaceState(null, "", `#${params}`);
  const page = await pdf.getPage(pageNumber);
  const scale = Math.min(
    1.4,
    (window.innerWidth - 40) / page.getViewport({ scale: 1 }).width,
  );
  const viewport = page.getViewport({ scale: Math.max(0.3, scale) });
  // Render offscreen so rapid navigation never races on a shared canvas.
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.setAttribute("aria-label", `PDF page ${pageNumber}`);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport })
    .promise;
  const text = await page.getTextContent();
  if (version !== renderVersion) return;
  document.querySelector("canvas").replaceWith(canvas);
  const highlights = $("highlights");
  highlights.replaceChildren();
  const layer = document.createElement("div");
  layer.id = "text";
  layer.className = "textLayer";
  layer.style.setProperty("--scale-factor", viewport.scale);
  $("text").replaceWith(layer);
  const textLayer = new TextLayer({
    textContentSource: text,
    container: layer,
    viewport,
  });
  await textLayer.render();
  if (version !== renderVersion) return;
  const ocr = metadata.ocr?.pages?.[pageNumber - 1];
  const items = ocr ? ocr.words.map(word => ({ textContent: word.text })) : textLayer.textDivs;
  const matches = matchingItems(items, $("name").value);
  const origin = $("sheet").getBoundingClientRect();
  for (const match of matches) {
    if (ocr) {
      const word = ocr.words[match.index];
      const box = document.createElement("span");
      box.className = "highlight";
      box.style.left = `${word.x * viewport.width}px`;
      box.style.top = `${word.y * viewport.height}px`;
      box.style.width = `${word.width * viewport.width}px`;
      box.style.height = `${word.height * viewport.height}px`;
      highlights.append(box);
      continue;
    }
    const node = textLayer.textDivs[match.index].firstChild;
    if (!node) continue;
    const range = document.createRange();
    range.setStart(node, match.start);
    range.setEnd(node, match.end);
    for (const rect of range.getClientRects()) {
      const box = document.createElement("span");
      box.className = "highlight";
      box.style.left = `${rect.left - origin.left}px`;
      box.style.top = `${rect.top - origin.top}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
      highlights.append(box);
    }
  }
  $("status").textContent = matches.length
    ? `Highlighted ${matches.length} matching name word${matches.length === 1 ? "" : "s"} on this page.`
    : "No matching name words on this page. OCR or spelling may differ; try another spelling in the search box.";
}
const report = (error) => {
  $("status").textContent = error.message;
};
async function load() {
  metadata = await readSource();
  $("title").textContent = metadata.title;
  document.title = metadata.title;
  pdf = await getDocument(
    metadata.data ? { data: decode(metadata.data) } : { url: metadata.url },
  ).promise;
  $("unlock").hidden = true;
  $("total").textContent = `of ${pdf.numPages}`;
  $("page").max = pdf.numPages;
  pageNumber += metadata.pageOffset || 0;
  originalUrl =
    metadata.url ||
    URL.createObjectURL(
      new Blob([decode(metadata.data)], { type: "application/pdf" }),
    );
  $("original").hidden = false;
  await render();
}
$("previous").onclick = () => {
  pageNumber--;
  render().catch(report);
};
$("next").onclick = () => {
  pageNumber++;
  render().catch(report);
};
$("page").onchange = () => {
  if (pdf) {
    pageNumber = Number($("page").value);
    render().catch(report);
  }
};
$("search").onsubmit = (event) => {
  event.preventDefault();
  if (pdf) render().catch(report);
};
$("unlock").onsubmit = (event) => {
  event.preventDefault();
  localStorage.setItem("familyTreePassword", $("password").value);
  load().catch(report);
};
load().catch(report);
