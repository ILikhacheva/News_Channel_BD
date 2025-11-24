// Загрузка переменных окружения из .env
// Loading environment variables from .env
require("dotenv").config();

// Импортируем необходимые модули
// Import required modules
const express = require("express");
const bcrypt = require("bcrypt"); // Для хеширования паролей / For password hashing
const cors = require("cors"); // Для кросс-доменных запросов / For cross-origin requests
const { Pool } = require("pg"); // PostgreSQL клиент / PostgreSQL client
const app = express(); // Экземпляр приложения Express / Express app instance

// Настраиваем CORS для разрешения кросс-доменных запросов
// Configure CORS to allow cross-origin requests
app.use(
  cors({
    origin: "*", // Разрешаем запросы с любого домена / Allow requests from any domain
  })
);

// Подключаем обслуживание статических файлов из текущей директории
// Serve static files from current directory
app.use(express.static(__dirname));

// Подключаем middleware для парсинга JSON в запросах
// Attach middleware for parsing JSON in requests
app.use(express.json());

// Создаем пул подключений к PostgreSQL базе данных
// Create a connection pool to PostgreSQL database
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "uutiset",
  user: process.env.DB_USER || "uutiset",
  password: process.env.DB_PASSWORD || "12345",
});

// Запускаем сервер на порту 3000
// Start server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Получить список категорий
// Get list of categories
app.get("/categories", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT category_id, category_name FROM categories ORDER BY category_name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DB ERROR /categories:", err);
    res.status(500).send("Database error");
  }
});

// Вход пользователя (POST /login)
// User login (POST /login)
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required." });
    }
    // Найти пользователя по email
    // Find user by email
    const userResult = await pool.query(
      "SELECT user_id, user_name, user_password FROM users WHERE user_email = $1",
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password." });
    }
    const user = userResult.rows[0];
    // Проверить пароль
    // Check password
    const match = await bcrypt.compare(password, user.user_password);
    if (!match) {
      return res.status(400).json({ error: "Invalid email or password." });
    }
    // Можно добавить генерацию токена, но пока просто успех
    // You can add token generation, but for now just success
    res.json({ success: true, userName: user.user_name });
  } catch (err) {
    console.error("DB ERROR /login:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// Добавить новость с категорией и описанием
// Add news with category and description (POST /add-news-full)
app.post("/add-news-full", async (req, res) => {
  const { category, news_link, news_head, news_discr, news_text } = req.body;
  if (!news_link || !news_head || !news_discr || !news_text) {
    return res.status(400).json({ error: "Invalid data" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Найти id выбранной категории
    // Find the id of the selected category
    const catRes = await client.query(
      "SELECT category_id FROM categories WHERE category_name = $1",
      [category]
    );
    if (catRes.rows.length === 0) throw new Error("Category not found");
    const categoryId = catRes.rows[0].category_id;
    // Вставляем новость
    // Insert the news
    const insQ = await client.query(
      "INSERT INTO news (news_link, news_head, news_discr, news_text, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING news_id",
      [news_link, news_head, news_discr, news_text, categoryId]
    );

    await client.query("COMMIT");
    res.json({ success: true, categoryId, newsId: insQ.rows[0].news_id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DB ERROR /add-news-full:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

// Получить новости по категории
// Get news by category
app.get("/news", async (req, res) => {
  const category = req.query.category;
  if (!category) {
    return res.status(400).json({ error: "Category required" });
  }
  try {
    // Получаем id категории
    const catRes = await pool.query(
      "SELECT category_id FROM categories WHERE category_name = $1",
      [category]
    );
    if (catRes.rows.length === 0) {
      return res.json([]); // Нет такой категории
    }
    const categoryId = catRes.rows[0].category_id;
    // Получаем новости этой категории
    // Get news of this category
    const newsRes = await pool.query(
      `SELECT news_id, news_link, news_head, news_discr, news_text, category_id
       FROM news WHERE category_id = $1 ORDER BY news_id DESC`,
      [categoryId]
    );
    res.json(newsRes.rows);
  } catch (err) {
    console.error("DB ERROR /news:", err);
    res.status(500).json({ error: "Database error" });
  }
});
