export default async function handler(req, res) {
  const { nicName } = req.query;

  if (!nicName) {
    return res.status(400).json({ error: 'nicName is required' });
  }

  try {
    const url = `https://m16tool.xyz/Game/FNF%20RPG%20J/UserLog/LogResult?nicName=${encodeURIComponent(nicName)}`;
    const response = await fetch(url);
    const text = await response.text();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
