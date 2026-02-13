const express = require("express");
const router = express.Router();
const db = require("../dataBase/db.js");
const { requireAuth } = require("../middleware/authMiddleware.js");
const { requireNonce } = require("../middleware/nonce.js");
const { sanitize } = require("../utils/sanitize.js");

function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mondayOfWeekFromYMD(ymd) {
  // ymd = "YYYY-MM-DD"
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d); // ✅ évite les soucis UTC du new Date("YYYY-MM-DD")
  date.setHours(0, 0, 0, 0);

  const day = date.getDay(); // 0=Dim..6=Sam
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return monday;
}


async function getActivePlanningForUser(userId) {
  const [uRows] = await db.execute(
    `SELECT Id_USER, email, Id_Planning
     FROM USER_
     WHERE Id_USER = ?
     LIMIT 1`,
    [userId]
  );

  if (!uRows.length) return { user: null, planning: null };

  const user = uRows[0];
  if (!user.Id_Planning) return { user, planning: null };

  const [pRows] = await db.execute(
    `SELECT *
     FROM Planning
     WHERE Id_Planning = ? AND user_id = ?
     LIMIT 1`,
    [user.Id_Planning, userId]
  );

  return { user, planning: pRows.length ? pRows[0] : null };
}


/**
 * DELETE /api/planning/evenement/:eventId
 * Supprime un événement (si l'événement appartient à un planning du user connecté)
 */
router.delete("/evenement/:eventId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.Id_USER;
    if (!userId) return res.status(401).json({ error: "Utilisateur non chargé (requireAuth)" });

    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Id événement invalide" });

    const [rows] = await db.execute(
      `SELECT e.id_evenement
       FROM evenement e
       JOIN Planning p ON p.Id_Planning = e.planning_id
       WHERE e.id_evenement = ? AND p.user_id = ?
       LIMIT 1`,
      [eventId, userId]
    );

    if (!rows.length) return res.status(404).json({ error: "Événement introuvable" });

    await db.execute(`DELETE FROM evenement WHERE id_evenement = ?`, [eventId]);

    return res.json({ message: "Événement supprimé" });
  } catch (err) {
    console.error("Delete event error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * PUT /api/planning/evenement/:eventId
 * Modifie un événement (si l'événement appartient à un planning du user connecté)
 */
router.put("/evenement/:eventId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.Id_USER;
    if (!userId) return res.status(401).json({ error: "Utilisateur non chargé (requireAuth)" });

    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Id événement invalide" });

    const { stream_title, day_of_week, start_time, end_time, game_name, game_cover_url } = req.body;

    // Sanitize user inputs
    const safeStreamTitle = sanitize(stream_title);
    const safeGameName = sanitize(game_name);
    const safeGameCoverUrl = sanitize(game_cover_url);

    if (!safeStreamTitle || day_of_week == null || !start_time) {
      return res.status(400).json({
        error: "stream_title, day_of_week et start_time sont obligatoires",
      });
    }

    const dayNum = Number(day_of_week);
    if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 7) {
      return res.status(400).json({ error: "day_of_week invalide (1-7)" });
    }

    // Vérifie que l'événement appartient au user
    const [rows] = await db.execute(
      `SELECT e.id_evenement
       FROM evenement e
       JOIN Planning p ON p.Id_Planning = e.planning_id
       WHERE e.id_evenement = ? AND p.user_id = ?
       LIMIT 1`,
      [eventId, userId]
    );

    if (!rows.length) return res.status(404).json({ error: "Événement introuvable" });

    await db.execute(
      `UPDATE evenement 
       SET stream_title = ?, day_of_week = ?, start_time = ?, end_time = ?, game_name = ?, game_cover_url = ?
       WHERE id_evenement = ?`,
      [safeStreamTitle, dayNum, start_time, end_time || null, safeGameName || null, safeGameCoverUrl || null, eventId]
    );

    return res.json({ message: "Événement modifié", id_evenement: eventId });
  } catch (err) {
    console.error("Update event error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/planning/:id/evenement
 * Ajoute un événement à un planning (si il appartient au user)
 */
router.post("/:id/evenement",  requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.Id_USER;
    if (!userId) return res.status(401).json({ error: "Utilisateur non chargé (requireAuth)" });

    const planningId = Number(req.params.id);
    if (!Number.isFinite(planningId)) return res.status(400).json({ error: "Id planning invalide" });

    const { stream_title, day_of_week, start_time, end_time, game_name, game_cover_url } = req.body;

    // Sanitize user inputs
    const safeStreamTitle = sanitize(stream_title);
    const safeGameName = sanitize(game_name);
    const safeGameCoverUrl = sanitize(game_cover_url);

    if (!safeStreamTitle || day_of_week == null || !start_time) {
      return res.status(400).json({
        error: "stream_title, day_of_week et start_time sont obligatoires",
      });
    }

    const dayNum = Number(day_of_week);
    if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 7) {
      return res.status(400).json({ error: "day_of_week invalide (1-7)" });
    }

    // Vérifie que le planning appartient au user
    const [pRows] = await db.execute(
      `SELECT Id_Planning
       FROM Planning
       WHERE Id_Planning = ? AND user_id = ?
       LIMIT 1`,
      [planningId, userId]
    );
    if (!pRows.length) return res.status(403).json({ error: "Planning non autorisé" });

    const [result] = await db.execute(
      `INSERT INTO evenement (planning_id, stream_title, day_of_week, start_time, end_time, game_name, game_cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [planningId, safeStreamTitle, dayNum, start_time, end_time || null, safeGameName || null, safeGameCoverUrl || null]
    );

    return res.json({
      message: "Événement ajouté",
      id_evenement: result.insertId, 
    });
  } catch (err) {
    console.error("Add event error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// =======================================================
// Routes planning
// =======================================================

/**
 * POST /api/planning
 * Crée un planning et le définit comme planning actif du user (USER_.Id_Planning)
 */
router.post("/",  requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.Id_USER;
    if (!userId) return res.status(401).json({ error: "Utilisateur non chargé" });

    const { title, start_date } = req.body;

    // Sanitize user inputs
    const safeTitle = sanitize(title);

    if (!safeTitle || !start_date) {
      return res.status(400).json({ error: "title et start_date sont obligatoires" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return res.status(400).json({ error: "start_date invalide (YYYY-MM-DD attendu)" });
    }

    const monday = mondayOfWeekFromYMD(start_date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const forcedStart = toYMD(monday);
    const forcedEnd = toYMD(sunday);
    const createdAt = toYMD(new Date());


    const [result] = await db.execute(
      `INSERT INTO Planning (title, user_id, start_date, end_date, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [safeTitle, userId, forcedStart, forcedEnd, createdAt]
    );

    const planningId = result.insertId;

    await db.execute(`UPDATE USER_ SET Id_Planning = ? WHERE Id_USER = ?`, [planningId, userId]);

    return res.json({ message: "Planning créé", Id_Planning: planningId, start_date: forcedStart, end_date: forcedEnd });
  } catch (err) {
    console.error("Create planning error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/planning/me
 * Retourne le planning actif du user + ses événements
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.Id_USER;
    if (!userId) return res.status(401).json({ error: "Utilisateur non chargé (requireAuth)" });

    const { planning } = await getActivePlanningForUser(userId);

    if (!planning) {
      return res.json({ planning: null, evenements: [] });
    }

    const [events] = await db.execute(
      `SELECT *
       FROM evenement
       WHERE planning_id = ?
       ORDER BY day_of_week ASC, start_time ASC`,
      [planning.Id_Planning]
    );

    return res.json({ planning, evenements: events });
  } catch (err) {
    console.error("Get my planning error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/** * GET /api/planning/list
 * Retourne la liste de tous les plannings du user (sans les événements)
 */
router.get("/list", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.Id_USER;
    if (!userId) return res.status(401).json({ error: "Utilisateur non chargé (requireAuth)" });

    const [plannings] = await db.execute(
      `SELECT Id_Planning, title, start_date, end_date, created_at
       FROM Planning
       WHERE user_id = ?
       ORDER BY start_date DESC`,
      [userId]
    );

    return res.json({ plannings });
  } catch (err) {
    console.error("Get planning list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/** * GET /api/planning/:id
 * Récupère un planning par id (uniquement si c’est celui du user)
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.Id_USER;
    if (!userId) return res.status(401).json({ error: "Utilisateur non chargé (requireAuth)" });

    const planningId = Number(req.params.id);
    if (!Number.isFinite(planningId)) return res.status(400).json({ error: "Id invalide" });

    const [pRows] = await db.execute(
      `SELECT *
       FROM Planning
       WHERE Id_Planning = ? AND user_id = ?
       LIMIT 1`,
      [planningId, userId]
    );

    if (!pRows.length) return res.status(404).json({ error: "Planning introuvable" });

    const [events] = await db.execute(
      `SELECT *
       FROM evenement
       WHERE planning_id = ?
       ORDER BY day_of_week ASC, start_time ASC`,
      [planningId]
    );

    return res.json({ planning: pRows[0], evenements: events });
  } catch (err) {
    console.error("Get planning by id error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /api/planning/:id
 * Supprime un planning + reset USER_.Id_Planning si actif
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.Id_USER;
    if (!userId) return res.status(401).json({ error: "Utilisateur non chargé (requireAuth)" });

    const planningId = Number(req.params.id);
    if (!Number.isFinite(planningId)) return res.status(400).json({ error: "Id invalide" });

    const [pRows] = await db.execute(
      `SELECT Id_Planning
       FROM Planning
       WHERE Id_Planning = ? AND user_id = ?
       LIMIT 1`,
      [planningId, userId]
    );
    if (!pRows.length) return res.status(404).json({ error: "Planning introuvable" });

    await db.execute(
      `UPDATE USER_
       SET Id_Planning = NULL
       WHERE Id_USER = ? AND Id_Planning = ?`,
      [userId, planningId]
    );

    await db.execute(`DELETE FROM evenement WHERE planning_id = ?`, [planningId]);
    await db.execute(`DELETE FROM Planning WHERE Id_Planning = ?`, [planningId]);

    return res.json({ message: "Planning supprimé" });
  } catch (err) {
    console.error("Delete planning error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
