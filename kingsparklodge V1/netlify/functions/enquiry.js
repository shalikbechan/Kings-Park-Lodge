// Kings Park Lodge — enquiry form handler
// Runs as a Netlify Function. Sends the enquiry to the lodge via Resend,
// and reads all secrets/config from environment variables (set these in
// Netlify: Site settings -> Environment variables).
//
// Required env vars:
//   RESEND_API_KEY   - your Resend API key
//   ENQUIRY_TO       - inbox that receives enquiries, e.g. info@kingsparklodge.co.za
//   ENQUIRY_FROM     - a "From" address on a domain verified in Resend,
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
  const toAddress = process.env.ENQUIRY_TO || "info@kingsparklodge.co.za";
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

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true, id: result.data && result.data.id })
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
