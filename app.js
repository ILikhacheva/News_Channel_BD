// --- Minimal News App Logic ---

// User state
window.newsState = window.newsState || {};

// Theme toggle
const themeBtn = document.getElementById("theme-toggle");
function setTheme(dark) {
  document.body.classList.remove("dark-theme");
  if (dark) document.body.classList.add("dark-theme");
  if (themeBtn) themeBtn.textContent = dark ? "☀️ Light mode" : "🌙 Dark mode";
}
// Always start in dark mode unless user chose light
let themePref = localStorage.getItem("theme");
if (themePref === "light") {
  setTheme(false);
} else {
  setTheme(true);
}
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark-theme");
    setTheme(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

// Sign-in/sign-out logic
const signInBtn = document.getElementById("sign-in-btn");
const signInOverlay = document.getElementById("SignInModalOverlay");
function updateSignInButton() {
  if (!signInBtn) return;
  if (newsState.userName && newsState.userName.trim().length > 0) {
    signInBtn.textContent = "Sign out";
  } else {
    signInBtn.textContent = "Sign in";
  }
}
function openSignInModal() {
  if (signInOverlay) signInOverlay.style.display = "flex";
}
function closeSignInModal() {
  if (signInOverlay) signInOverlay.style.display = "none";
}
window.closeSignInModal = closeSignInModal;
if (signInBtn) {
  signInBtn.addEventListener("click", function () {
    if (newsState.userName && newsState.userName.trim().length > 0) {
      newsState.userName = "";
      updateSignInButton();
      updateAddNewsButton();
    } else {
      openSignInModal();
    }
  });
}
updateSignInButton();

// Sign-in form submit
const signInForm = document.getElementById("SignInForm");
if (signInForm) {
  signInForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("SignInEmail").value.trim();
    const password = document.getElementById("SignInPassword").value;
    const err = document.getElementById("SignInError");
    err.style.display = "none";
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        err.textContent = data.error || "Login failed";
        err.style.display = "block";
        return;
      }
      closeSignInModal();
      newsState.userName = data.userName;
      updateSignInButton();
      updateAddNewsButton();
      alert("Welcome, " + data.userName + "!");
    } catch (e) {
      err.textContent = "Server error";
      err.style.display = "block";
    }
  });
}

// Add news modal logic
const addNewsBtn = document.getElementById("add-news-btn");
const addNewsOverlay = document.getElementById("AddNewsOverlay");
function openAddModal() {
  if (addNewsOverlay) addNewsOverlay.style.display = "flex";
}
function closeAddModal() {
  if (addNewsOverlay) addNewsOverlay.style.display = "none";
}
window.closeAddModal = closeAddModal;
if (addNewsBtn) {
  addNewsBtn.addEventListener("click", openAddModal);
}
function updateAddNewsButton() {
  if (!addNewsBtn) return;
  if (newsState.userName && newsState.userName.trim().length > 0) {
    addNewsBtn.style.display = "inline-block";
  } else {
    addNewsBtn.style.display = "none";
  }
}
updateAddNewsButton();

// Add news form submit
const addForm = document.getElementById("AddForm");
const addCategorySelect = document.getElementById("AddCategorySelect");
const addCategoryNew = document.getElementById("AddCategoryNew");
if (addForm) {
  addForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const category = addCategorySelect.value;
    const news_link = document.getElementById("AddNews").value.trim();
    const news_head = document.getElementById("AddHead").value.trim();
    const news_discr = document.getElementById("AddDiscr").value.trim();
    const news_text = document.getElementById("AddText").value.trim();
    const errorDiv = document.getElementById("AddError");
    errorDiv.style.display = "none";
    if (!news_link || !news_head || !news_discr || !news_text) {
      errorDiv.textContent = "Fill in all fields";
      errorDiv.style.display = "block";
      return;
    }
    if (category === "") {
      errorDiv.textContent = "Select a category";
      errorDiv.style.display = "block";
      return;
    }
    try {
      const res = await fetch("/add-news-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          news_link,
          news_head,
          news_discr,
          news_text,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        errorDiv.textContent = data.error || "Error saving news";
        errorDiv.style.display = "block";
        return;
      }
      errorDiv.style.display = "none";
      addForm.reset();
      alert("News added!");
      closeAddModal();
    } catch (e) {
      errorDiv.textContent = "Server error";
      errorDiv.style.display = "block";
    }
  });
}
if (addCategorySelect) {
  addCategorySelect.addEventListener("change", function () {
    if (addCategorySelect.value === "__new__") {
      addCategoryNew.style.display = "block";
      addCategoryNew.required = true;
    } else {
      addCategoryNew.style.display = "none";
      addCategoryNew.required = false;
    }
  });
}
// Load categories for add form
async function loadCategoriesForAddForm() {
  if (!addCategorySelect) return;
  try {
    const res = await fetch("/categories");
    const categories = await res.json();
    while (addCategorySelect.options.length > 1) {
      addCategorySelect.remove(1);
    }
    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.category_name;
      opt.textContent = cat.category_name;
      addCategorySelect.appendChild(opt);
    });
  } catch (e) {}
}
if (addNewsBtn) {
  addNewsBtn.addEventListener("click", loadCategoriesForAddForm);
}

// Загрузка и рендер новостей по категории
async function loadAndRenderNews(categoryName, gridEl) {
  if (!gridEl) return;
  gridEl.innerHTML = '<div style="color:gray">Загрузка...</div>';
  try {
    const res = await fetch(
      `/news?category=${encodeURIComponent(categoryName)}`
    );
    const news = await res.json();
    if (!Array.isArray(news) || news.length === 0) {
      gridEl.innerHTML = '<div style="color:gray">No news</div>';
      return;
    }
    gridEl.innerHTML = "";
    news.forEach((item) => {
      const card = document.createElement("div");
      card.className = "life-news-card";
      card.innerHTML = `
        <img class="life-news-img" src="${
          item.news_link || ""
        }" alt="News image" onerror="this.style.display='none'" />
        <div class="life-news-title">${item.news_head || ""}</div>
        <div class="life-news-desc">${item.news_discr || ""}</div>
        <div class="full-text" style="display:none">${
          item.news_text || ""
        }</div>
        <button class="read-more-btn" onclick="toggleFullText(this, event)">Read more</button>
      `;
      gridEl.appendChild(card);
    });
  } catch (e) {
    gridEl.innerHTML = '<div style="color:red">Ошибка загрузки новостей</div>';
  }
}

// Динамические вкладки и панели по категориям с загрузкой новостей

// Запуск динамических вкладок при загрузке
// При загрузке страницы сразу загружаем новости для всех четырёх категорий
window.addEventListener("DOMContentLoaded", () => {
  ["Life", "Sports", "Weather", "Nature"].forEach((cat) => {
    const gridEl = document.querySelector(
      `#tab-${cat.toLowerCase()} .life-news-grid`
    );
    if (gridEl) {
      loadAndRenderNews(cat, gridEl);
    }
  });
  // Оставляем только логику переключения вкладок
  const tabsContainer = document.querySelector(".tabs");
  const tabContent = document.querySelector(".tab-content");
  if (tabsContainer && tabContent) {
    tabsContainer.querySelectorAll(".tab-link").forEach((btn) => {
      btn.addEventListener("click", function () {
        tabsContainer
          .querySelectorAll(".tab-link")
          .forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        const tab = this.getAttribute("data-tab");
        tabContent.querySelectorAll(".tab-panel").forEach((panel) => {
          panel.style.display = "none";
        });
        const tabPanel = tabContent.querySelector("#tab-" + tab);
        if (tabPanel) tabPanel.style.display = "block";
      });
    });
  }
});

// Expand/collapse news card full text
function toggleFullText(btn, event) {
  event.stopPropagation();
  const card = btn.closest(".life-news-card");
  const fullText = card.querySelector(".full-text");
  if (fullText.style.display === "none" || !fullText.style.display) {
    fullText.style.display = "block";
    btn.textContent = "Collapse";
  } else {
    fullText.style.display = "none";
    btn.textContent = "Read more";
  }
}
