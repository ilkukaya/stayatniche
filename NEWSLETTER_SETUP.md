# Newsletter Setup Guide

The site uses **Netlify Forms** to capture email signups, with an optional serverless function to sync subscribers to an email marketing platform.

## How It Works

1. User fills out the form on `/newsletter` or the homepage
2. Netlify Forms stores the submission
3. A webhook triggers `netlify/functions/newsletter-subscribe.js`
4. The function forwards the subscriber to your chosen provider

## Step 1: Choose a Free Provider

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Beehiiv** ⭐ | 2,500 subscribers, unlimited emails | Newsletter-first platform, beautiful |
| **Mailchimp** | 500 contacts, 1,000 emails/month | Industry standard, drag-drop editor |
| **Brevo** | 300 emails/day, unlimited contacts | High volume, transactional too |
| **None (Netlify only)** | Unlimited, manual export | Just getting started |

**Recommendation: Beehiiv** — best newsletter UX, 2,500 free subs, growing fast.

---

## Step 2: Set Up Your Provider

### Option A — Beehiiv (Recommended)
1. Sign up at [beehiiv.com](https://www.beehiiv.com) — free up to 2,500 subs
2. Create a publication called "StayAtNiche"
3. Go to **Settings → API** → Generate API key
4. Note your **Publication ID** (looks like `pub_xxxxxxxxxx`)

### Option B — Mailchimp
1. Sign up at [mailchimp.com](https://mailchimp.com) — free up to 500 contacts
2. Create an Audience
3. Go to **Account → Extras → API keys** → Create key
4. Note your **List/Audience ID** from Audience → Settings → Audience name
5. Note your **server prefix** (last part of API key after `-`, e.g. `us14`)

### Option C — Brevo
1. Sign up at [brevo.com](https://brevo.com) — 300 emails/day free
2. Create a contact list
3. Go to **Settings → API keys** → Generate
4. Note your **List ID** from Contacts → Lists

---

## Step 3: Configure Netlify Environment Variables

In your **Netlify dashboard → Site settings → Environment variables**, add:

```
NEWSLETTER_PROVIDER = beehiiv   (or: mailchimp, brevo, none)
```

**For Beehiiv:**
```
BEEHIIV_API_KEY = your_api_key_here
BEEHIIV_PUB_ID  = pub_xxxxxxxxxx
```

**For Mailchimp:**
```
MAILCHIMP_API_KEY = your_api_key-us14
MAILCHIMP_LIST_ID = xxxxxxxxxx
MAILCHIMP_SERVER  = us14
```

**For Brevo:**
```
BREVO_API_KEY = your_api_key_here
BREVO_LIST_ID = 1   (your list's integer ID)
```

---

## Step 4: Connect the Webhook

1. Go to **Netlify dashboard → Site settings → Forms → Form notifications**
2. Click **Add notification → Outgoing webhook**
3. Set **Event to listen for**: `New form submission`
4. Set **Form**: `newsletter`
5. Set **URL**: `https://YOUR-SITE.netlify.app/.netlify/functions/newsletter-subscribe`
6. Save

---

## Step 5: Test It

1. Deploy the site
2. Submit the newsletter form
3. Check Netlify dashboard → Forms → `newsletter` (should show the submission)
4. Check your email provider dashboard (subscriber should appear within seconds)

---

## Current Form Locations

- **Homepage** — inline hero form
- **/newsletter** — full dedicated signup page
- **/newsletter-success** — post-signup thank you page

## Viewing Submissions Without an Email Provider

Even without configuring a provider, all submissions are stored in:
**Netlify dashboard → Forms → newsletter**

You can export them as CSV and import manually to any platform.
