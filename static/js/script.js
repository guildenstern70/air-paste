/*
 * AirPaste
 * Remote Copy & Paste Service
 * Copyright (c) 2026 Alessio Saltarin
 * ISC License
 */

// State Variables
let currentCode = window.APP_STATE?.currentCode || "";
let lastUpdatedAt = window.APP_STATE?.lastUpdatedAt || 0;

// DOM Elements
const textarea = document.getElementById("snippet-input");
const counter = document.getElementById("char-counter");
const statusHint = document.getElementById("textarea-status-hint");
const saveButton = document.getElementById("save-button");
const saveButtonText = saveButton.querySelector("span");
const saveButtonIcon = saveButton.querySelector(".btn-icon");
const sharePanel = document.getElementById("share-panel");
const shareCodeDigits = document.getElementById("share-code-digits");
const shareQrImg = document.getElementById("share-qr-img");
const copyBtn = document.getElementById("copy-btn");
const retrieveForm = document.getElementById("retrieve-form");
const retrieveInput = document.getElementById("retrieve-input");

// Update character counter
function updateCounter() {
  const len = textarea.value.length;
  counter.textContent = `${len.toLocaleString()} character${
    len === 1 ? "" : "s"
  }`;
}
textarea.addEventListener("input", updateCounter);
updateCounter();

// Toast Notifications System
function showToast(message, type = "success") {
  // Remove any existing toast to prevent stacking clutter
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger reflow/animation
  setTimeout(() => toast.classList.add("visible"), 10);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Check URL parameters for errors
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("error") === "notfound") {
  showToast("The paste code was not found or has expired.", "error");
  // Clean URL query parameters
  window.history.replaceState({}, document.title, window.location.pathname);
}

// Format code: "123456" -> "123 456"
function formatCode(code) {
  if (code && code.length === 6) {
    return code.slice(0, 3) + " " + code.slice(3);
  }
  return code || "--- ---";
}

// Update UI based on code/sync state
function updateStateUI(code) {
  currentCode = code;
  if (code) {
    saveButtonText.textContent = "Update Paste";
    statusHint.textContent = "Synchronized";
    // Set update/sync icon
    saveButtonIcon.innerHTML =
      `<path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.78 16.28C19.55 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.22 7.72C4.45 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z" fill="currentColor"/>`;

    shareCodeDigits.textContent = formatCode(code);
    const link = `${window.location.origin}/${code}`;
    shareQrImg.src =
      `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${
        encodeURIComponent(link)
      }`;
    sharePanel.classList.add("active");
  } else {
    saveButtonText.textContent = "Save Snippet";
    statusHint.textContent = "Ready to share";
    saveButtonIcon.innerHTML =
      `<path d="M19 12.998H13V18.998H11V12.998H5V10.998H11V4.998H13V10.998H19V12.998Z" fill="currentColor"/>`;
    sharePanel.classList.remove("active");
  }
}

// Initialize UI state
if (currentCode) {
  updateStateUI(currentCode);
}

// Save/Update paste submission
document.querySelector(".paste-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = textarea.value;
  if (!content.trim()) {
    showToast("Please type something first!", "error");
    return;
  }

  saveButton.disabled = true;
  saveButtonText.textContent = currentCode ? "Updating..." : "Saving...";

  try {
    const url = currentCode ? `/api/paste/${currentCode}` : "/api/paste";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error("Server error");
    }

    const data = await response.json();

    if (!currentCode && data.code) {
      updateStateUI(data.code);
      window.history.pushState({ code: data.code }, "", `/${data.code}`);
      showToast("Paste saved! Scan QR or copy link to share.");
    } else {
      showToast("Paste updated successfully!");
    }
    lastUpdatedAt = Date.now();
  } catch (err) {
    showToast("Failed to save paste. Please try again.", "error");
  } finally {
    saveButton.disabled = false;
    updateStateUI(currentCode);
  }
});

// Copy magic link to clipboard
copyBtn.addEventListener("click", async () => {
  if (!currentCode) return;
  const link = `${window.location.origin}/${currentCode}`;
  try {
    await navigator.clipboard.writeText(link);
    showToast("Link copied to clipboard!");
  } catch (err) {
    // Fallback for older browsers
    const el = document.createElement("textarea");
    el.value = link;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast("Link copied to clipboard!");
  }
});

// Clean spaces on paste in retrieve input
retrieveInput.addEventListener("paste", (e) => {
  e.preventDefault();
  const pastedData = (e.clipboardData || window.clipboardData).getData("text");
  const cleanData = pastedData.replace(/\s+/g, "").slice(0, 6);
  retrieveInput.value = cleanData;
});

// Retrieve paste submission
retrieveForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = retrieveInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    showToast("Please enter a valid 6-digit code.", "error");
    return;
  }

  const submitBtn = retrieveForm.querySelector("button");
  submitBtn.disabled = true;

  try {
    const response = await fetch(`/api/paste/${code}`);
    if (!response.ok) {
      if (response.status === 404) {
        showToast("Code not found or expired.", "error");
      } else {
        showToast("Failed to fetch paste.", "error");
      }
      return;
    }

    const data = await response.json();
    textarea.value = data.content;
    updateCounter();
    updateStateUI(code);
    lastUpdatedAt = data.updatedAt;

    window.history.pushState({ code }, "", `/${code}`);
    retrieveInput.value = "";
    showToast("Paste retrieved successfully!");
  } catch (err) {
    showToast("Connection error. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Auto check/sync when the page gains focus (visibilitychange)
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible" && currentCode) {
    try {
      const response = await fetch(`/api/paste/${currentCode}`);
      if (response.ok) {
        const data = await response.json();
        // Compare timestamps (allow a 1-second margin)
        if (data.updatedAt > lastUpdatedAt + 1000) {
          textarea.value = data.content;
          updateCounter();
          lastUpdatedAt = data.updatedAt;
          showToast("Synced! Content updated from another device.", "info");
        }
      }
    } catch (e) {
      console.warn("Background sync failed:", e);
    }
  }
});

// Handle back/forward navigation
window.addEventListener("popstate", async (event) => {
  const pathCode = window.location.pathname.match(/^\/(\d{6})$/);
  if (pathCode) {
    const code = pathCode[1];
    try {
      const response = await fetch(`/api/paste/${code}`);
      if (response.ok) {
        const data = await response.json();
        textarea.value = data.content;
        updateCounter();
        updateStateUI(code);
        lastUpdatedAt = data.updatedAt;
      }
    } catch (e) {
      // Fallback UI
    }
  } else if (
    window.location.pathname === "/" ||
    window.location.pathname === "/index.html"
  ) {
    textarea.value = "";
    updateCounter();
    updateStateUI("");
    lastUpdatedAt = 0;
  }
});
