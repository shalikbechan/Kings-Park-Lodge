# Kings Park Lodge — Website

A static, mobile-first marketing website for Kings Park Lodge (Morningside, Durban), with a Netlify Function that sends the enquiry form via **Resend**. There is currently **no booking engine** — every "Enquire Now" leads to a call, email or the enquiry form, by design, so a real booking plugin can be dropped in later without a redesign.

## What's in here

```
index.html, accommodation.html, rates.html, facilities.html,
location.html, about.html, contact.html, 404.html   -> the site pages
css/style.css                                        -> shared design system
js/main.js                                            -> nav, form handling, rates/price sync
data/site-data.json                                   -> editable business info & rates (see below)
netlify/functions/enquiry.js                          -> serverless function, sends enquiries via Resend
netlify.toml                                          -> Netlify build & routing config
package.json                                          -> declares the "resend" dependency
.env.example                                          -> the environment variables you need to set
```

## 1. Deploy to Netlify

1. Push this folder to a GitHub/GitLab/Bitbucket repo (or drag-and-drop deploy via the Netlify UI for a first pass).
2. In Netlify: **Add new site -> Import an existing project**, pick the repo. Build settings are already defined in `netlify.toml` (no build step needed — it's a static site), so you can accept the defaults.
3. In **Site settings -> Domain management**, add your domain and point its DNS at Netlify (Netlify will show you the exact records — usually an `A`/`ALIAS` record at the apex and a `CNAME` for `www`).

## 2. Connect Resend (for the enquiry form)

1. Create a free account at resend.com if you don't have one.
2. Verify your sending domain in Resend (Domains -> Add Domain) and add the DNS records it gives you — this lets you send from an address like `enquiries@kingsparklodge.co.za` instead of a shared Resend testing address.
3. Create an API key in Resend (Dashboard -> API Keys).
4. In Netlify: **Site settings -> Environment variables**, add:
   - `RESEND_API_KEY` — the key from step 3
   - `ENQUIRY_TO` — the inbox that should receive enquiries, e.g. `info@kingsparklodge.co.za`
   - `ENQUIRY_FROM` — a verified sending address, e.g. `Kings Park Lodge Website <enquiries@kingsparklodge.co.za>`
   - `ALLOWED_ORIGIN` — your live domain, e.g. `https://www.kingsparklodge.co.za` (locks down who can call the function)
5. Redeploy. The contact form on `/contact.html` posts to `/.netlify/functions/enquiry`, which emails whoever `ENQUIRY_TO` is set to, with **Reply-To** set to the guest's own email so you can just hit reply.

Until these env vars are set, the form will show a friendly error asking guests to call or email directly instead — it will never look like the message succeeded when it didn't.

## 3. Editing rates and business details

Open `data/site-data.json`. It's loaded by every page and used to keep the phone number, email, address and Google Maps link consistent across the whole site, and (on the homepage and Rates page) to update rate figures. To change a rate, check-in/out time or the specials wording, edit the relevant value in this file — the current values are also mirrored directly in the HTML so the correct price always shows even before the JSON loads or if JavaScript is disabled, so **when you change a rate, update it in both places**: `data/site-data.json` and the matching `<div class="rate-amount">` / `<div class="rate-meta">` text in `index.html` and `rates.html`.

If you'd rather manage this from a proper admin screen instead of editing files by hand, the natural next step is to move `data/site-data.json` behind a small headless CMS (e.g. Netlify CMS/Decap, or a WordPress instance used only for content via its REST API) — the site's markup and JS were written so that swap doesn't require touching the design.

## 4. Adding a booking engine later

Nothing here fakes availability, dates, or payment — that was intentional. When you're ready to add real bookings:

- Every "Enquire Now" button is a plain link to `/contact.html` (or `tel:`/`mailto:`) — swap its `href`/label to your booking engine's URL, or replace the button with the plugin's embed code, room by room or site-wide.
- The accommodation cards (`accommodation.html`, and the homepage preview) are self-contained `<article class="room-card">` blocks — a booking plugin's "Check Availability" widget can be dropped into the `.room-footer` of each card in place of the current Enquire button.
- The rates section (`rates.html`) is similarly modular — each `.rate-card` can gain a real-time price/availability feed without changing the surrounding layout.
- The contact form's Netlify Function (`netlify/functions/enquiry.js`) can stay in place for general questions even after a booking plugin handles actual reservations and payment.

## 5. Photography

The site currently uses tasteful, on-brand placeholder photo panels (in Kings Park Lodge's maroon/cream palette) wherever a real photograph should go, each labelled with what it represents. Every one is a `<div class="ph-photo tone-...">...</div>` sized to a `4:3` ratio — replace it with an `<img>` tag using the same class names (or just add `src`/`alt` directly) once real photography of the rooms, kitchen and exterior is available, and no other layout changes are needed.

## 6. Local development

```
npm install
npx netlify dev
```

`netlify dev` runs the static site and the function together locally (it needs the [Netlify CLI](https://docs.netlify.com/cli/get-started/); install with `npm install -g netlify-cli` if you don't have it). Create a local `.env` file (see `.env.example`) with your Resend test key so the form works locally too.
