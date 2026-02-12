const express = require("express");
const router = express.Router();
const db = require("../dataBase/db.js");
const { requireAuth } = require("../middleware/authMiddleware.js");


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


module.exports = router;
