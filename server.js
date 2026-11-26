const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, context } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ reply: 'Veuillez saisir une question.' });
    }

    if (!apiKey) {
      return res.status(500).json({
        reply: "La clé API IA n'est pas encore configurée sur le serveur (GEMINI_API_KEY)."
      });
    }

    const systemPrompt = `Tu es l'assistant officiel de Smile with me ("Décrocher un sourire").
Réponds en français de manière claire, chaleureuse et concise.
Règles à respecter :
- Délai minimum obligatoire de 48 heures avant la date de l'événement.
- Les articles commandés dans la boutique sont réglés intégralement à part (budget achats).
- Pour la prestation proposée : 50 % d'acompte maintenant et 50 % sur place à la fin de l'événement.
- Responsable principal : JOHNS (+243 970 037 868).
Contexte de la réservation : ${JSON.stringify(context || {})}`;

    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nQuestion du client : ${String(message).trim()}` }]
            }
          ]
        })
      }
    );

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error('Erreur API Gemini :', data);
      return res.status(502).json({
        reply: "Le service IA a retourné une erreur. Réessayez dans un instant."
      });
    }

    const replyText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Je n'ai pas pu générer de réponse pour le moment.";

    return res.json({ reply: replyText });
  } catch (err) {
    console.error('Erreur /api/ai-chat :', err);
    return res.status(500).json({
      reply: "Erreur serveur lors de l'appel à l'IA."
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré avec succès sur http://0.0.0.0:${PORT}`);
});
