const express = require("express");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "jornal.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error("Falha ao abrir banco SQLite:", error);
    process.exit(1);
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS noticias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      image TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
}

function parseId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

function validateNewsPayload(payload) {
  const errors = [];

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  const reporterName =
    typeof payload.reporterName === "string" ? payload.reporterName.trim() : "";
  const image = payload.image ?? null;

  if (title.length < 5 || title.length > 100) {
    errors.push("O titulo deve ter entre 5 e 100 caracteres.");
  }
  if (content.length < 20 || content.length > 2000) {
    errors.push("A noticia deve ter entre 20 e 2000 caracteres.");
  }
  if (reporterName.length < 2 || reporterName.length > 50) {
    errors.push("O nome deve ter entre 2 e 50 caracteres.");
  }
  if (image !== null) {
    if (typeof image !== "string" || !image.startsWith("data:image/")) {
      errors.push("A imagem precisa ser uma imagem valida em base64.");
    } else if (image.length > 8_000_000) {
      errors.push("A imagem e muito grande.");
    }
  }

  return {
    errors,
    sanitized: {
      title,
      content,
      reporterName,
      image,
    },
  };
}

app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

app.get("/api/news", async (req, res) => {
  try {
    const news = await all(
      `
        SELECT
          id,
          title,
          content,
          reporter_name AS reporterName,
          image,
          likes,
          created_at AS createdAt
        FROM noticias
        ORDER BY created_at DESC, id DESC
      `
    );
    res.json(news);
  } catch (error) {
    console.error("Erro ao listar noticias:", error);
    res.status(500).json({ message: "Erro ao carregar noticias." });
  }
});

app.post("/api/news", async (req, res) => {
  try {
    const { errors, sanitized } = validateNewsPayload(req.body || {});
    if (errors.length > 0) {
      res.status(400).json({ message: errors[0], errors });
      return;
    }

    const insertResult = await run(
      `
        INSERT INTO noticias (title, content, reporter_name, image)
        VALUES (?, ?, ?, ?)
      `,
      [sanitized.title, sanitized.content, sanitized.reporterName, sanitized.image]
    );

    const created = await get(
      `
        SELECT
          id,
          title,
          content,
          reporter_name AS reporterName,
          image,
          likes,
          created_at AS createdAt
        FROM noticias
        WHERE id = ?
      `,
      [insertResult.lastID]
    );

    res.status(201).json(created);
  } catch (error) {
    console.error("Erro ao publicar noticia:", error);
    res.status(500).json({ message: "Erro ao publicar noticia." });
  }
});

app.patch("/api/news/:id/like", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ message: "ID invalido." });
    return;
  }

  try {
    const updateResult = await run(
      `
        UPDATE noticias
        SET likes = likes + 1
        WHERE id = ?
      `,
      [id]
    );

    if (updateResult.changes === 0) {
      res.status(404).json({ message: "Noticia nao encontrada." });
      return;
    }

    const updated = await get(
      `
        SELECT
          id,
          title,
          content,
          reporter_name AS reporterName,
          image,
          likes,
          created_at AS createdAt
        FROM noticias
        WHERE id = ?
      `,
      [id]
    );

    res.json(updated);
  } catch (error) {
    console.error("Erro ao curtir noticia:", error);
    res.status(500).json({ message: "Erro ao curtir noticia." });
  }
});

app.delete("/api/news/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ message: "ID invalido." });
    return;
  }

  try {
    const deleteResult = await run(
      `
        DELETE FROM noticias
        WHERE id = ?
      `,
      [id]
    );

    if (deleteResult.changes === 0) {
      res.status(404).json({ message: "Noticia nao encontrada." });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error("Erro ao apagar noticia:", error);
    res.status(500).json({ message: "Erro ao apagar noticia." });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Rota da API nao encontrada." });
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Jornal da Duda rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao inicializar servidor:", error);
    process.exit(1);
  }
}

startServer();

process.on("SIGINT", () => {
  db.close((error) => {
    if (error) {
      console.error("Erro ao fechar banco:", error);
      process.exit(1);
    }
    process.exit(0);
  });
});
