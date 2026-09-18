// Google Apps Script (GAS) のWebアプリURLをここに設定
const GAS_API_URL = "ここに取得したGASのWebアプリURLを貼り付け";

// サービスワーカーの登録（PWA化）
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((err) => {
    console.error("ServiceWorker registration failed: ", err);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const familyModal = document.getElementById("family-modal");
  const familyIdInput = document.getElementById("family-id-input");
  const saveFamilyBtn = document.getElementById("save-family-btn");
  const configBtn = document.getElementById("config-btn");

  const addForm = document.getElementById("add-form");
  const buyerSelect = document.getElementById("buyer-select");
  const buyerCustom = document.getElementById("buyer-custom");
  const recipientSelect = document.getElementById("recipient-select");
  const recipientCustom = document.getElementById("recipient-custom");
  const categorySelect = document.getElementById("category-select");
  const categoryCustom = document.getElementById("category-custom");
  const itemNameInput = document.getElementById("item-name-input");
  const souvenirList = document.getElementById("souvenir-list");
  const refreshBtn = document.getElementById("refresh-btn");
  const loading = document.getElementById("loading");

  // 初回起動チェック
  let familyId = localStorage.getItem("family_id");
  if (!familyId) {
    familyModal.style.display = "flex";
  } else {
    fetchList();
  }

  // 合言葉の保存
  saveFamilyBtn.addEventListener("click", () => {
    const val = familyIdInput.value.trim();
    if (val) {
      localStorage.setItem("family_id", val);
      familyId = val;
      familyModal.style.display = "none";
      fetchList();
    }
  });

  configBtn.addEventListener("click", () => {
    familyIdInput.value = familyId || "";
    familyModal.style.display = "flex";
  });

  // 自由入力の切り替え制御
  setupCustomSelect(buyerSelect, buyerCustom);
  setupCustomSelect(recipientSelect, recipientCustom);
  setupCustomSelect(categorySelect, categoryCustom);

  function setupCustomSelect(selectEl, customInputEl) {
    selectEl.addEventListener("change", (e) => {
      if (e.target.value === "__NEW__") {
        customInputEl.classList.remove("hidden");
        customInputEl.required = true;
        customInputEl.focus();
      } else {
        customInputEl.classList.add("hidden");
        customInputEl.required = false;
        customInputEl.value = "";
      }
    });
  }

  // リスト取得処理
  function fetchList() {
    if (!familyId) return;
    showLoading(true);
    fetch(`${GAS_API_URL}?family_id=${encodeURIComponent(familyId)}`)
      .then((res) => res.json())
      .then((data) => {
        renderList(data);
      })
      .catch((err) => console.error(err))
      .finally(() => showLoading(false));
  }

  // リスト描画（「購入者」タグも表示）
  function renderList(items) {
    souvenirList.innerHTML = "";
    if (items.length === 0) {
      souvenirList.innerHTML = '<li class="empty-msg">登録されたお土産はありません</li>';
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = `list-item ${item.is_bought ? "bought" : ""}`;

      const buyerText = item.buyer ? `👤 ${escapeHtml(item.buyer)}` : "";

      li.innerHTML = `
        <input type="checkbox" ${item.is_bought ? "checked" : ""} data-id="${item.id}">
        <div class="item-details">
          <div class="item-tags">
            ${buyerText ? `<span class="tag tag-buyer">${buyerText}</span>` : ""}
            <span class="tag tag-recipient">${escapeHtml(item.recipient)}</span>
            <span class="tag tag-category">${escapeHtml(item.category)}</span>
          </div>
          <div class="item-title">${escapeHtml(item.item_name || "(指定なし)")}</div>
        </div>
      `;

      const checkbox = li.querySelector('input[type="checkbox"]');
      checkbox.addEventListener("change", () => {
        toggleBought(item.id);
      });

      souvenirList.appendChild(li);
    });
  }

  // 新規追加送信
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const buyer = buyerSelect.value === "__NEW__" ? buyerCustom.value.trim() : buyerSelect.value;
    const recipient = recipientSelect.value === "__NEW__" ? recipientCustom.value.trim() : recipientSelect.value;
    const category = categorySelect.value === "__NEW__" ? categoryCustom.value.trim() : categorySelect.value;
    const itemName = itemNameInput.value.trim();

    if (!buyer || !recipient || !category) return;

    showLoading(true);

    const payload = {
      action: "add",
      family_id: familyId,
      buyer: buyer,
      recipient: recipient,
      category: category,
      item_name: itemName
    };

    fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then(() => {
        itemNameInput.value = "";
        
        // 自由入力欄だった場合はリセット
        resetCustomSelect(buyerSelect, buyerCustom, "共有");
        resetCustomSelect(recipientSelect, recipientCustom, "職場");
        resetCustomSelect(categorySelect, categoryCustom, "お菓子");

        itemNameInput.focus();
        fetchList();
      })
      .catch((err) => {
        console.error(err);
        showLoading(false);
      });
  });

  function resetCustomSelect(selectEl, customInputEl, defaultValue) {
    if (selectEl.value === "__NEW__") {
      selectEl.value = defaultValue;
      customInputEl.classList.add("hidden");
      customInputEl.value = "";
    }
  }

  function toggleBought(id) {
    showLoading(true);
    fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "toggle", id: id })
    })
      .then((res) => res.json())
      .then(() => fetchList())
      .catch((err) => {
        console.error(err);
        showLoading(false);
      });
  }

  refreshBtn.addEventListener("click", fetchList);

  function showLoading(show) {
    if (show) loading.classList.remove("hidden");
    else loading.classList.add("hidden");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
});