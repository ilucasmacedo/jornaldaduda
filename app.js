class JornalApp {
  constructor() {
    this.currentImagePreview = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadNews();
    this.showWelcomeMessage();
  }

  setupEventListeners() {
    document.getElementById("publishBtn").addEventListener("click", () => this.publishNews());
    document.getElementById("clearBtn").addEventListener("click", () => this.clearForm());
    document.getElementById("toggleModeBtn").addEventListener("click", () => this.toggleMode());

    document
      .getElementById("newsImage")
      .addEventListener("change", (event) => this.handleImagePreview(event));

    document
      .getElementById("newsTitle")
      .addEventListener("input", (event) => this.validateField(event.target, "title"));
    document
      .getElementById("newsContent")
      .addEventListener("input", (event) => this.validateField(event.target, "content"));
    document
      .getElementById("reporterName")
      .addEventListener("input", (event) => this.validateField(event.target, "name"));

    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "Enter") {
        this.publishNews();
      }
    });
  }

  async request(url, options = {}) {
    const response = await fetch(url, options);

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await response.json() : null;

    if (!response.ok) {
      throw new Error(body?.message || "Erro ao executar requisicao.");
    }

    return body;
  }

  validateField(field, type) {
    const value = field.value.trim();
    let isValid = true;
    let message = "";

    switch (type) {
      case "title":
        if (value.length < 5) {
          message = "O titulo deve ter pelo menos 5 caracteres";
          isValid = false;
        } else if (value.length > 100) {
          message = "O titulo deve ter no maximo 100 caracteres";
          isValid = false;
        }
        break;
      case "content":
        if (value.length < 20) {
          message = "A noticia deve ter pelo menos 20 caracteres";
          isValid = false;
        } else if (value.length > 2000) {
          message = "A noticia deve ter no maximo 2000 caracteres";
          isValid = false;
        }
        break;
      case "name":
        if (value.length < 2) {
          message = "O nome deve ter pelo menos 2 caracteres";
          isValid = false;
        } else if (value.length > 50) {
          message = "O nome deve ter no maximo 50 caracteres";
          isValid = false;
        }
        break;
      default:
        break;
    }

    this.showFieldValidation(field, isValid, message);
    return isValid;
  }

  showFieldValidation(field, isValid, message) {
    field.classList.remove("valid", "invalid");

    const existingMessage = field.parentNode.querySelector(".validation-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    if (message) {
      field.classList.add(isValid ? "valid" : "invalid");

      const messageElement = document.createElement("div");
      messageElement.className = `validation-message ${isValid ? "valid" : "invalid"}`;
      messageElement.textContent = message;
      messageElement.style.cssText = `
        font-size: 0.8rem;
        margin-top: 5px;
        color: ${isValid ? "#4ecdc4" : "#ff6b6b"};
        font-weight: bold;
      `;

      field.parentNode.appendChild(messageElement);
    }
  }

  handleImagePreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById("imagePreview");

    if (!file) {
      preview.innerHTML = "<p>Nenhuma imagem selecionada</p>";
      this.currentImagePreview = null;
      return;
    }

    if (!file.type.startsWith("image/")) {
      this.showNotification("Selecione apenas arquivos de imagem!", "error");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showNotification("A imagem deve ter no maximo 5MB!", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      preview.innerHTML = `<img src="${readerEvent.target.result}" alt="Preview da imagem">`;
      this.currentImagePreview = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  }

  async publishNews() {
    const titleInput = document.getElementById("newsTitle");
    const contentInput = document.getElementById("newsContent");
    const reporterInput = document.getElementById("reporterName");

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const reporterName = reporterInput.value.trim();

    if (
      !this.validateField(titleInput, "title") ||
      !this.validateField(contentInput, "content") ||
      !this.validateField(reporterInput, "name")
    ) {
      this.showNotification("Corrija os erros do formulario antes de publicar.", "error");
      return;
    }

    try {
      await this.request("/api/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          reporterName,
          image: this.currentImagePreview,
        }),
      });

      this.showNotification("Noticia publicada com sucesso!", "success");
      this.clearForm();
      await this.loadNews();

      setTimeout(() => {
        const firstNewsCard = document.querySelector(".news-card");
        if (firstNewsCard) {
          firstNewsCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    } catch (error) {
      console.error("Erro ao publicar noticia:", error);
      this.showNotification(error.message || "Erro ao publicar noticia!", "error");
    }
  }

  clearForm() {
    document.getElementById("newsTitle").value = "";
    document.getElementById("newsContent").value = "";
    document.getElementById("reporterName").value = "";
    document.getElementById("newsImage").value = "";
    document.getElementById("imagePreview").innerHTML = "<p>Nenhuma imagem selecionada</p>";
    this.currentImagePreview = null;

    const fields = ["newsTitle", "newsContent", "reporterName"];
    fields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      field.classList.remove("valid", "invalid");
      const message = field.parentNode.querySelector(".validation-message");
      if (message) {
        message.remove();
      }
    });

    this.showNotification("Formulario limpo!", "info");
  }

  async loadNews() {
    const newsGrid = document.getElementById("newsGrid");

    try {
      const news = await this.request("/api/news");

      if (!Array.isArray(news) || news.length === 0) {
        newsGrid.innerHTML = `
          <div class="no-news">
            <h3>📰 Nenhuma noticia ainda!</h3>
            <p>Seja o primeiro a escrever uma noticia incrivel!</p>
            <div class="emoji-suggestions">
              <span>💡 Dica: voce pode escrever sobre:</span>
              <ul>
                <li>🎮 Seu jogo favorito</li>
                <li>🐕 Seu animal de estimacao</li>
                <li>🎨 Uma atividade legal que voce fez</li>
                <li>🏫 Algo interessante da escola</li>
                <li>🌟 Uma descoberta que voce fez</li>
              </ul>
            </div>
          </div>
        `;
        return;
      }

      const mappedNews = news.map((item) => {
        const dateValue = item.createdAt ? new Date(item.createdAt) : new Date();
        return {
          ...item,
          date: Number.isNaN(dateValue.getTime())
            ? "Agora"
            : dateValue.toLocaleString("pt-BR"),
        };
      });

      newsGrid.innerHTML = mappedNews.map((item) => this.createNewsCard(item)).join("");

      mappedNews.forEach((item) => {
        const likeBtn = document.getElementById(`like-${item.id}`);
        if (likeBtn) {
          likeBtn.addEventListener("click", () => this.toggleLike(item.id));
        }

        const delBtn = document.getElementById(`del-${item.id}`);
        if (delBtn) {
          delBtn.addEventListener("click", () => this.deleteNews(item.id));
        }
      });
    } catch (error) {
      console.error("Erro ao carregar noticias:", error);
      newsGrid.innerHTML = `
        <div class="no-news">
          <h3>⚠️ Nao foi possivel carregar as noticias</h3>
          <p>Verifique se o servidor esta rodando.</p>
        </div>
      `;
      this.showNotification("Erro ao carregar noticias!", "error");
    }
  }

  createNewsCard(news) {
    const imageHtml = news.image
      ? `<img src="${news.image}" alt="Imagem da noticia" class="news-image">`
      : "";

    const isEditMode = document.getElementById("editorSection").style.display !== "none";
    const deleteButton = isEditMode
      ? `<button class="btn btn-secondary" id="del-${news.id}" style="margin-left:10px;">🗑️ Apagar</button>`
      : "";

    return `
      <div class="news-card" data-id="${news.id}">
        ${imageHtml}
        <h3 class="news-title">${this.escapeHtml(news.title)}</h3>
        <p class="news-content">${this.escapeHtml(news.content)}</p>
        <div class="news-meta">
          <span class="reporter-name">👤 ${this.escapeHtml(news.reporterName)}</span>
          <div class="news-actions">
            <button class="like-btn" id="like-${news.id}" data-likes="${news.likes || 0}">
              ${(news.likes || 0) > 0 ? "❤️" : "🤍"} ${news.likes || 0}
            </button>
            ${deleteButton}
            <span class="news-date">📅 ${news.date}</span>
          </div>
        </div>
      </div>
    `;
  }

  async toggleLike(newsId) {
    try {
      await this.request(`/api/news/${newsId}/like`, { method: "PATCH" });
      await this.loadNews();

      const likeBtn = document.getElementById(`like-${newsId}`);
      if (likeBtn) {
        likeBtn.style.transform = "scale(1.2)";
        setTimeout(() => {
          likeBtn.style.transform = "scale(1)";
        }, 200);
      }
    } catch (error) {
      console.error("Erro ao curtir noticia:", error);
      this.showNotification("Erro ao curtir noticia!", "error");
    }
  }

  async deleteNews(newsId) {
    if (!window.confirm("Tem certeza que deseja apagar esta noticia?")) {
      return;
    }

    try {
      await this.request(`/api/news/${newsId}`, { method: "DELETE" });
      this.showNotification("Noticia apagada!", "success");
      await this.loadNews();
    } catch (error) {
      console.error("Erro ao apagar noticia:", error);
      this.showNotification("Erro ao apagar noticia!", "error");
    }
  }

  toggleMode() {
    const editorSection = document.getElementById("editorSection");
    const toggleBtn = document.getElementById("toggleModeBtn");

    if (editorSection.style.display === "none") {
      editorSection.style.display = "block";
      toggleBtn.textContent = "👁️ Modo Leitura";
      toggleBtn.className = "btn btn-secondary";
    } else {
      editorSection.style.display = "none";
      toggleBtn.textContent = "✏️ Modo Edicao";
      toggleBtn.className = "btn btn-primary";
    }

    this.loadNews();
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = "info") {
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 10px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;

    const colors = {
      success: "#4ecdc4",
      error: "#ff6b6b",
      info: "#667eea",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  showWelcomeMessage() {
    setTimeout(() => {
      this.showNotification(
        "Bem-vindo ao Jornal da Duda! Comece escrevendo sua primeira noticia!",
        "info"
      );
    }, 1000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new JornalApp();
});
