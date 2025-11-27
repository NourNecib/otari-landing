// api/waitlist.js
const { MongoClient } = require('mongodb');

let client;
let clientPromise;

// URI lue depuis la variable d'environnement MONGODB_URI (qu'on mettra dans Vercel)
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI manquante. Ajoute-la dans les variables d’environnement Vercel.');
}

// Connexion réutilisable (important en serverless)
function getClient() {
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

// Lire le JSON envoyé par le front (body de la requête)
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(data || '{}');
        resolve(json);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Handler de la route /api/waitlist
module.exports = async (req, res) => {
  // 1) On accepte uniquement POST
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end('Méthode non autorisée');
  }

  // 2) Lire le JSON
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    res.statusCode = 400;
    return res.end('Body JSON invalide');
  }

  const email = (body.email || '').trim();

  if (!email || !email.includes('@')) {
    res.statusCode = 400;
    return res.end('Email invalide');
  }

  try {
    // 3) Connexion à MongoDB
    const client = await getClient();
    const db = client.db('otari'); // nom de ta database
    const collection = db.collection('waitlist_emails'); // nom de ta collection

    // 4) Insertion
    await collection.insertOne({
      email,
      created_at: new Date()
    });

    // 5) Réponse OK
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    console.error('Erreur Mongo / API waitlist :', err);
    res.statusCode = 500;
    res.end('Erreur serveur');
  }
};
