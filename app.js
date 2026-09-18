// Google Apps Script (GAS) のWebアプリURLをここに設定
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzWjQ8m4Evo7mOW8AVfJo5GiwQQkLqLEGeEXkMpA0eOHlsodwhJBr2H1LYJ_cjbPvvL/exec";

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
  const recipientSelect = document.getElementById("recipient-select");
  const recipientCustom = document.getElementById("recipient-custom");
  const categorySelect = document.getElementById("category-select");
  const categoryCustom = document.getElementById("category-custom");
  const itemNameInput = document.getElementById("item-name-input");
  const souvenirList = document.getElementById("souvenir-list");
  const refreshBtn = document.getElementById("refresh-btn");
  const loading = document.getElementById("loading");

  // 初回起動チェック（合言葉の記憶）
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

  // ギアアイコンで合言葉を変更
  configBtn.addEventListener("click", () => {
    familyIdInput.value = familyId || "";
    familyModal.style.display = "flex";
  });

  // プルダウン「＋ 新しく追加する...」の表示切り替え制御
  recipientSelect.addEventListener("change", (e) => {
    if (e.target.value === "__NEW__") {
      recipientCustom.classList.remove("hidden");
      recipientCustom.required = true;
      recipientCustom.focus();
    } else {
      recipientCustom.classList.add("hidden");
      recipientCustom.required = false;
      recipientCustom.value = "";
    }
  });

  categorySelect.addEventListener("change", (e) => {
    if (e.target.value === "__NEW__") {
      categoryCustom.classList.remove("hidden");
      categoryCustom.required = true;
      categoryCustom.focus();
    } else {
      categoryCustom.classList.add("hidden");
      categoryCustom.required = false;
      categoryCustom.value = "";
    }
  });

  // リスト取得処理
  function fetchList() {
    if (!familyId) return;
    showLoading(true);
    fetch(`${GAS_API_URL}?family_id=${encodeURIComponent(familyId)}`)
      .then((res) => res.json())
      .then((data) => {
        renderList(data);
        showLoading(false);
      })
      .catch((err) => {
        console.error(err);
        showLoading(false);
      });
  }

  // リスト描画
  function renderList(items) {
    souvenirList.innerHTML = "";
    if (items.length === 0) {
      souvenirList.innerHTML = '<li class="empty-msg">登録されたお土産はありません</li>';
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = `list-item ${item.is_bought ? "bought" : ""}`;

      li.innerHTML = `
        <input type="checkbox" ${item.is_bought ? "checked" : ""} data-id="${item.id}">
        <div class="item-details">
          <div class="item-tags">
            <span class="tag tag-recipient">${escapeHtml(item.recipient)}</span>
            <span class="tag tag-category">${escapeHtml(item.category)}</span>
          </div>
          <div class="item-title">${escapeHtml(item.item_name)}</div>
        </div>
      `;

      // チェックボックス切り替え
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

    const recipient = recipientSelect.value === "__NEW__" ? recipientCustom.value.trim() : recipientSelect.value;
    const category = categorySelect.value === "__NEW__" ? categoryCustom.value.trim() : categorySelect.value;
    const itemName = itemNameInput.value.trim();

    if (!recipient || !category || !itemName) return;

    showLoading(true);

    const payload = {
      action: "add",
      family_id: familyId,
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
        // フォームリセット
        itemNameInput.value = "";
        recipientSelect.value = "職場";
        categorySelect.value = "お菓子";
        recipientCustom.classList.add("hidden");
        categoryCustom.classList.add("hidden");
        recipientCustom.value = "";
        categoryCustom.value = "";

        fetchList();
      })
      .catch((err) => {
        console.error(err);
        showLoading(false);
      });
  });

  // 購入フラグ切り替え
  function toggleBought(id) {
    showLoading(true);
    const payload = {
      action: "toggle",
      id: id
    };

    fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then(() => {
        fetchList();
      })
      .catch((err) => {
        console.error(err);
        showLoading(false);
      });
  }

  refreshBtn.addEventListener("click", fetchList);

  function showLoading(show) {
    if (show) {
      loading.classList.remove("hidden");
    } else {
      loading.classList.add("hidden");
    }
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