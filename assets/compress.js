const fileInput = document.querySelector("#image-file");
const targetInput = document.querySelector("#target-kb");
const maxWidthInput = document.querySelector("#max-width");
const formatInput = document.querySelector("#format");
const compressButton = document.querySelector("#compress-button");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");

let selectedFile = null;

const params = new URLSearchParams(location.search);
const presetTarget = params.get("target") || document.body.dataset.target;
if (presetTarget && targetInput) {
  targetInput.value = presetTarget;
}

fileInput?.addEventListener("change", () => {
  selectedFile = fileInput.files?.[0] || null;
  statusBox.textContent = selectedFile ? `已选择：${selectedFile.name}` : "";
});

compressButton?.addEventListener("click", async () => {
  if (!selectedFile) {
    statusBox.textContent = "请先选择一张图片。";
    return;
  }

  const targetBytes = Number(targetInput.value) * 1024;
  const maxWidth = Number(maxWidthInput.value);
  const mimeType = formatInput.value;

  if (!targetBytes || targetBytes < 10 * 1024) {
    statusBox.textContent = "目标大小建议至少 10KB。";
    return;
  }

  compressButton.disabled = true;
  statusBox.textContent = "正在压缩...";

  try {
    const image = await loadImage(selectedFile);
    const canvas = drawToCanvas(image, maxWidth);
    const blob = await compressToTarget(canvas, mimeType, targetBytes);
    showResult(blob, selectedFile);
    statusBox.textContent = "压缩完成。";
  } catch (error) {
    statusBox.textContent = error.message || "压缩失败，请换一张图片再试。";
  } finally {
    compressButton.disabled = false;
  }
});

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败。"));
    };

    image.src = url;
  });
}

function drawToCanvas(image, maxWidth) {
  const ratio = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas;
}

async function compressToTarget(canvas, mimeType, targetBytes) {
  let low = 0.1;
  let high = 0.95;
  let best = await canvasToBlob(canvas, mimeType, high);

  for (let i = 0; i < 8; i += 1) {
    const quality = (low + high) / 2;
    const blob = await canvasToBlob(canvas, mimeType, quality);

    if (blob.size > targetBytes) {
      high = quality;
    } else {
      low = quality;
      best = blob;
    }
  }

  if (best.size > targetBytes) {
    throw new Error("当前尺寸下无法压到目标大小，请降低最大宽度。");
  }

  return best;
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("浏览器不支持该格式。"))),
      mimeType,
      quality
    );
  });
}

function showResult(blob, originalFile) {
  const url = URL.createObjectURL(blob);
  const ext = blob.type.includes("webp") ? "webp" : "jpg";
  const name = originalFile.name.replace(/\.[^.]+$/, "") || "compressed";

  resultBox.hidden = false;
  resultBox.innerHTML = `
    <img src="${url}" alt="压缩后的图片预览">
    <div class="metric"><span>原图大小</span><strong>${formatSize(originalFile.size)}</strong></div>
    <div class="metric"><span>压缩后</span><strong>${formatSize(blob.size)}</strong></div>
    <div class="metric"><span>节省</span><strong>${Math.max(0, Math.round((1 - blob.size / originalFile.size) * 100))}%</strong></div>
    <a class="download" href="${url}" download="${name}-compressed.${ext}">下载压缩图片</a>
  `;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}
