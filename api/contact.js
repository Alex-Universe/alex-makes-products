const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value) => typeof value === 'string' ? value.trim() : '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, whatsapp, message } = req.body ?? {};
  const lead = { name: clean(name), email: clean(email), whatsapp: clean(whatsapp), message: clean(message) };
  if (!lead.name || !lead.message || !emailPattern.test(lead.email)) {
    return res.status(400).json({ error: 'Invalid contact details' });
  }

  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_LEADS_TABLE;
  if (!token || !baseId || !table) {
    return res.status(500).json({ error: 'Contact service is not configured' });
  }

  try {
    const airtableResponse = await fetch(`https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields: { Nombre: lead.name, Email: lead.email, Whatsapp: lead.whatsapp, Mensaje: lead.message } }] }),
    });
    if (!airtableResponse.ok) {
      const airtableError = await airtableResponse.json().catch(() => null);
      console.error('Airtable lead creation failed', { status: airtableResponse.status, type: airtableError?.error?.type, message: airtableError?.error?.message });
      return res.status(502).json({ error: 'Could not create lead' });
    }
  } catch (error) {
    console.error('Airtable lead creation request failed', { message: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(502).json({ error: 'Could not create lead' });
  }
  return res.status(201).json({ ok: true });
}
