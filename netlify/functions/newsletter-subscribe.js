/**
 * Netlify Function: newsletter-subscribe
 *
 * Triggered by Netlify Forms submission webhook.
 * Routes subscribers to your chosen provider via environment variables.
 *
 * SETUP in Netlify dashboard → Site settings → Forms → Notifications:
 *   Add webhook: https://your-site.netlify.app/.netlify/functions/newsletter-subscribe
 *
 * ENV VARS to set in Netlify dashboard → Site settings → Environment variables:
 *
 *   NEWSLETTER_PROVIDER = "beehiiv" | "mailchimp" | "brevo" | "none"
 *
 *   For Beehiiv (free up to 2,500 subs — recommended):
 *     BEEHIIV_API_KEY    = your API key from app.beehiiv.com → Settings → API
 *     BEEHIIV_PUB_ID     = your publication ID (pub_xxxxxxxx)
 *
 *   For Mailchimp (free up to 500 contacts):
 *     MAILCHIMP_API_KEY  = your API key from mailchimp.com → Account → API keys
 *     MAILCHIMP_LIST_ID  = audience/list ID
 *     MAILCHIMP_SERVER   = server prefix e.g. "us1" (from API key suffix)
 *
 *   For Brevo / Sendinblue (300 emails/day free):
 *     BREVO_API_KEY      = your API key from brevo.com → Settings → API keys
 *     BREVO_LIST_ID      = list ID number (integer)
 */

// Lightweight, RFC-5321-friendly enough email regex. Rejects the obvious.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Refuse oversized bodies early. Netlify caps at 6 MB but newsletter
  // submissions should be a few hundred bytes at most.
  if (event.body && event.body.length > 10_000) {
    return { statusCode: 413, body: "Payload too large" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  // Netlify Forms sends: { payload: { data: { email, name, ... } } }
  const formData = payload?.payload?.data || payload?.data || payload;

  // Honeypot — any submission that filled the hidden bot-field is spam.
  if (formData?.["bot-field"]) {
    return { statusCode: 200, body: JSON.stringify({ message: "ok" }) };
  }

  const email = (formData?.email || "").trim().toLowerCase();
  const name = (formData?.name || "").trim();
  const firstName = name.split(" ")[0] || "";

  if (!email) {
    return { statusCode: 400, body: "No email in submission" };
  }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { statusCode: 400, body: "Invalid email" };
  }
  if (firstName.length > 80) {
    return { statusCode: 400, body: "Name too long" };
  }

  const provider = process.env.NEWSLETTER_PROVIDER || "none";

  try {
    switch (provider) {
      case "beehiiv":
        await subscribeBeehiiv(email, firstName);
        break;
      case "mailchimp":
        await subscribeMailchimp(email, firstName);
        break;
      case "brevo":
        await subscribeBrevo(email, firstName);
        break;
      default:
        // No provider configured — submissions are stored in Netlify Forms dashboard
        console.log(`Newsletter signup (no provider): ${email}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Subscribed successfully", email }),
    };
  } catch (err) {
    console.error("Newsletter subscribe error:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Beehiiv ──────────────────────────────────────────────────────────────────
async function subscribeBeehiiv(email, firstName) {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUB_ID;
  if (!apiKey || !pubId) throw new Error("BEEHIIV_API_KEY or BEEHIIV_PUB_ID not set");

  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name: firstName || undefined,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: "website",
        utm_medium: "organic",
        utm_campaign: "newsletter_form",
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Beehiiv API error ${res.status}: ${body}`);
  }
}

// ── Mailchimp ─────────────────────────────────────────────────────────────────
async function subscribeMailchimp(email, firstName) {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const server = process.env.MAILCHIMP_SERVER;
  if (!apiKey || !listId || !server)
    throw new Error("MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, or MAILCHIMP_SERVER not set");

  const res = await fetch(
    `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members`,
    {
      method: "POST",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        merge_fields: { FNAME: firstName },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    const parsed = JSON.parse(body);
    // 400 with "Member Exists" is OK
    if (parsed?.title === "Member Exists") return;
    throw new Error(`Mailchimp API error ${res.status}: ${body}`);
  }
}

// ── Brevo / Sendinblue ────────────────────────────────────────────────────────
async function subscribeBrevo(email, firstName) {
  const apiKey = process.env.BREVO_API_KEY;
  const listId = parseInt(process.env.BREVO_LIST_ID, 10);
  if (!apiKey || !listId) throw new Error("BREVO_API_KEY or BREVO_LIST_ID not set");

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: firstName },
      listIds: [listId],
      updateEnabled: true,
    }),
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}
