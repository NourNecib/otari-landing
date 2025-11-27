// api/admin-waitlist.js
const { MongoClient } = require('mongodb');

let client;
let clientPromise;

const uri = process.env.MONGODB_URI;
const adminToken = process.env.ADMIN_TOKEN;

if (!uri) {
  throw new Error('MONGODB_URI manquante.');
}
if (!adminToken) {
  throw new Error('ADMIN_TOKEN manquante.');
}

function getClient() {
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

module.exports = async (req, res) => {
  // On n'accepte que GET
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end('Méthode non autorisée');
  }

  // Vérif du "mot de passe admin" envoyé dans le header
  const tokenFromRequest = req.headers['x-admin-token'];

  if (!tokenFromRequest || tokenFromRequest !== adminToken) {
    res.statusCode = 401;
    return res.end('Non autorisé');
  }

  try {
    const client = await getClient();
    const db = client.db('otari');
    const collection = db.collection('waitlist_emails');

    const docs = await collection
      .find({}, { projection: { email: 1, created_at: 1 } })
      .sort({ created_at: -1 })
      .limit(500)
      .toArray();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ emails: docs }));
  } catch (err) {
    console.error('Erreur admin-waitlist :', err);
    res.statusCode = 500;
    res.end('Erreur serveur');
  }
};
