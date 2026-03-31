const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, 'reporting.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom_fs TEXT NOT NULL,
  periode TEXT NOT NULL,
  nombre_accompagnements INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  UNIQUE(nom_fs, periode)
);
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/report', (req, res) => {
  const { nom_fs, periode, nombre_accompagnements, data } = req.body;

  const stmt = db.prepare(`
    INSERT INTO reports (nom_fs, periode, nombre_accompagnements, data_json)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(nom_fs, periode)
    DO UPDATE SET
      nombre_accompagnements=excluded.nombre_accompagnements,
      data_json=excluded.data_json
  `);

  stmt.run(
    nom_fs,
    periode,
    nombre_accompagnements,
    JSON.stringify(data)
  );

  res.json({ ok: true });
});

app.get('/api/report', (req, res) => {
  const { nom_fs, periode } = req.query;

  const row = db.prepare(`
    SELECT * FROM reports
    WHERE nom_fs=? AND periode=?
  `).get(nom_fs, periode);

  if (!row) {
    return res.status(404).json({ error: "not found" });
  }

  res.json({
    nom_fs: row.nom_fs,
    periode: row.periode,
    nombre_accompagnements: row.nombre_accompagnements,
    data: JSON.parse(row.data_json)
  });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
