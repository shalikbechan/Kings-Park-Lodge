// Kings Park Lodge — enquiry form handler
// Runs as a Netlify Function. Sends the enquiry to the lodge via Resend,
// and reads all secrets/config from environment variables (set these in
// Netlify: Site settings -> Environment variables).
//
// Required env vars:
//   RESEND_API_KEY   - your Resend API key
//   ENQUIRY_TO       - inbox that receives enquiries (defaults to kingsparklodge@gmail.com)
//   ENQUIRY_FROM     - optional. Leave unset to send from Resend's shared address
//                      (onboarding@resend.dev), or use an address on a domain verified in Resend,
//                      e.g. "Kings Park Lodge Website <enquiries@kingsparklodge.co.za>"
// Optional:
//   ALLOWED_ORIGIN   - restrict CORS to your live domain, e.g. https://kingsparklodge.co.za

const { Resend } = require("resend");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Guest confirmation email ----------
const LODGE_PHONE = "031 303 2887";
const LODGE_ADDRESS = "38 Adrian Road, Morningside, Durban";

function guestHtml(firstName, phone, message) {
  return (
    "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2b1d1a;\">" +
    "<div style=\"background:#731b19;padding:22px 26px;\">" +
    "<h1 style=\"margin:0;font-family:Georgia,serif;font-size:22px;color:#ffffff;\">Kings Park Lodge</h1>" +
    "</div>" +
    "<div style=\"padding:26px;background:#faf6f0;\">" +
    "<p style=\"font-size:16px;margin:0 0 14px;\">Hi " + escapeHtml(firstName) + ",</p>" +
    "<p style=\"font-size:15px;line-height:1.55;margin:0 0 14px;\">Thank you for your enquiry. It has been sent to the Kings Park Lodge management team, and we'll get back to you as soon as possible.</p>" +
    "<p style=\"font-size:15px;line-height:1.55;margin:0 0 8px;\"><strong>Your message:</strong></p>" +
    "<p style=\"font-size:15px;line-height:1.55;margin:0 0 18px;padding:12px 14px;background:#ffffff;border-left:3px solid #731b19;white-space:pre-wrap;\">" + escapeHtml(message) + "</p>" +
    "<p style=\"font-size:15px;line-height:1.55;margin:0 0 18px;\">We'll contact you on <strong>" + escapeHtml(phone) + "</strong> or by email. If your enquiry is urgent, please call us on <a href=\"tel:+27313032887\" style=\"color:#731b19;\">" + LODGE_PHONE + "</a>.</p>" +
    "<p style=\"font-size:15px;margin:0;\">Kind regards,<br>Kings Park Lodge</p>" +
    "</div>" +
    "<p style=\"font-size:12px;color:#8a7a74;padding:14px 26px;margin:0;\">" + LODGE_ADDRESS + " &middot; " + LODGE_PHONE + "<br>You're receiving this because you sent an enquiry on kingsparklodge.co.za. Reply to this email to reach us.</p>" +
    "</div>"
  );
}

function guestText(firstName, phone, message) {
  return (
    "Hi " + firstName + ",\n\n" +
    "Thank you for your enquiry. It has been sent to the Kings Park Lodge management team, and we'll get back to you as soon as possible.\n\n" +
    "Your message:\n" + message + "\n\n" +
    "We'll contact you on " + phone + " or by email. If your enquiry is urgent, please call us on " + LODGE_PHONE + ".\n\n" +
    "Kind regards,\nKings Park Lodge\n" + LODGE_ADDRESS + "\n\n" +
    "You're receiving this because you sent an enquiry on kingsparklodge.co.za. Reply to this email to reach us."
  );
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "Method not allowed" })
    };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "Invalid request body" })
    };
  }

  // Honeypot: a hidden field named "company" that real guests never fill in.
  // If it's filled, silently pretend success so bots move on.
  if (data.company) {
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ ok: true }) };
  }

  const firstName = (data.firstName || "").trim();
  const lastName = (data.lastName || "").trim();
  const email = (data.email || "").trim();
  const phone = (data.phone || "").trim();
  const message = (data.message || "").trim();
  const source = (data.source || "website enquiry form").trim();

  if (!firstName || !email || !phone || !message) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "Missing required fields" })
    };
  }

  if (!isValidEmail(email)) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "Invalid email address" })
    };
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "Email service is not configured yet" })
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const toAddress = process.env.ENQUIRY_TO || "kingsparklodge@gmail.com";
  const fromAddress = process.env.ENQUIRY_FROM || "Kings Park Lodge Website <onboarding@resend.dev>";

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const subject = "New enquiry from " + fullName + " (Kings Park Lodge website)";

  const html =
    "<h2 style=\"font-family:Georgia,serif;color:#731b19;\">New Website Enquiry</h2>" +
    "<p><strong>Name:</strong> " + escapeHtml(fullName) + "</p>" +
    "<p><strong>Email:</strong> " + escapeHtml(email) + "</p>" +
    "<p><strong>Cellphone:</strong> " + escapeHtml(phone) + "</p>" +
    "<p><strong>Source:</strong> " + escapeHtml(source) + "</p>" +
    "<p><strong>Message:</strong></p>" +
    "<p style=\"white-space:pre-wrap;\">" + escapeHtml(message) + "</p>";

  const text =
    "New Website Enquiry\n\n" +
    "Name: " + fullName + "\n" +
    "Email: " + email + "\n" +
    "Cellphone: " + phone + "\n" +
    "Source: " + source + "\n\n" +
    "Message:\n" + message;

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      reply_to: email,
      subject: subject,
      html: html,
      text: text
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return {
        statusCode: 502,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: false, error: "Could not send enquiry email" })
      };
    }

    // Confirmation email to the guest. If this one fails, the enquiry has
    // still reached the lodge, so we report success and just log the problem.
    let confirmationSent = false;
    try {
      const guestResult = await resend.emails.send({
        from: fromAddress,
        to: email,
        reply_to: toAddress,
        subject: "We've received your enquiry - Kings Park Lodge",
        html: guestHtml(firstName, phone, message),
        text: guestText(firstName, phone, message)
      });
      if (guestResult.error) {
        console.error("Guest confirmation error:", guestResult.error);
      } else {
        confirmationSent = true;
      }
    } catch (guestErr) {
      console.error("Guest confirmation error:", guestErr);
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true, id: result.data && result.data.id, confirmationSent: confirmationSent })
    };
  } catch (err) {
    console.error("Enquiry function error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: "Unexpected server error" })
    };
  }
};
