const express = require("express");
const router = express.Router();
const db = require("../dataBase/db.js");
const { requireAuth } = require("../middleware/authMiddleware.js");
const { requireNonce } = require("../middleware/nonce.js");


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
 * POST /api/planning
 * Crée un planning et le définit comme planning actif du user (USER_.Id_Planning)
 */

router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = 1?.Id_USER;
    if (!userId) return res.status(500).json({ error: "Utilisateur non chargé (requireAuth)" });

    const { title, start_date, end_date } = req.body;

    if (!title || !start_date) {
      return res.status(400).json({ error: "title et start_date sont obligatoires" });
    }

    const createdAt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [result] = await db.execute(
      `INSERT INTO Planning (title, user_id, start_date, end_date, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [title, userId, start_date, end_date || null, createdAt]
    );

    const planningId = result.insertId;

    await db.execute(
      `UPDATE USER_ SET Id_Planning = ? WHERE Id_USER = ?`,
      [planningId, userId]
    );

    return res.json({ message: "Planning créé", Id_Planning: planningId });
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
    const userId = req.user?.Id_USER;
    if (!userId) return res.status(500).json({ error: "Utilisateur non chargé (requireAuth)" });

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

/**
 * GET /api/planning/:id
 * Récupère un planning par id (uniquement si c’est celui du user)
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.Id_USER;
    if (!userId) return res.status(500).json({ error: "Utilisateur non chargé (requireAuth)" });

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
 * Supprime un planning (et reset USER_.Id_Planning si c'était le planning actif)
 * (ON DELETE CASCADE gérera la suppression des événements si la FK est en cascade côté evenement->Planning.
 *  Si pas de cascade, il faut delete les événements avant.)
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.Id_USER;
    if (!userId) return res.status(500).json({ error: "Utilisateur non chargé (requireAuth)" });

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
