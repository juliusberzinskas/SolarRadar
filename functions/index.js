const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

/**
 * HTTP Cloud Function: deleteAuthUser
 * Called by the web admin panel to delete a Firebase Auth account.
 * Body: { uid: string }
 */
exports.deleteAuthUser = onRequest(
  { region: "europe-west1", cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { uid } = req.body;
    if (!uid) {
      res.status(400).json({ error: "Missing uid" });
      return;
    }

    try {
      await getAuth().deleteUser(uid);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("deleteAuthUser error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
