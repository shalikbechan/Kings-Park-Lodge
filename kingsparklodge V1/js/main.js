/* Kings Park Lodge — shared front-end behaviour
   - Mobile nav drawer
   - Renders rates / rooms / facilities from /data/site-data.json
     so content editors only ever need to touch ONE file.
   - Enquiry form submit handler -> Netlify Function -> Resend
*/
(function () {
  "use strict";

  var DATA_URL = "/data/site-data.json";

  /* ---------------- Mobile nav ---------------- */
  function initNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var drawer = document.querySelector("[data-nav-drawer]");
    var close = document.querySelector("[data-nav-close]");
    if (!toggle || !drawer) return;

    function open() {
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    function shut() {
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
    toggle.addEventListener("click", open);
    if (close) close.addEventListener("click", shut);
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", shut);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") shut();
    });
  }

  /* ---------------- Helpers ---------------- */
  function fmtPrice(n) {
    return "R" + Number(n).toLocaleString("en-ZA");
  }

  function fetchData() {
    return fetch(DATA_URL, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Could not load site data");
      return r.json();
    });
  }

  /* ---------------- Rates rendering ---------------- */
  function renderRates(data) {
    var mount = document.querySelector("[data-rates]");
    if (!mount) return;
    var r = data.rates;

    var overnight = mount.querySelector("[data-rate='overnight']");
    var day = mount.querySelector("[data-rate='day']");
    var early = mount.querySelector("[data-rate='earlyCheckIn']");

    function fill(el, key, item, extra) {
      if (!el) return;
      var amountEl = el.querySelector("[data-field='amount']");
      if (amountEl) amountEl.innerHTML = "<sup>R</sup>" + item.price;
      var metaEl = el.querySelector("[data-field='meta']");
      if (metaEl) metaEl.innerHTML = extra;
      var noteEl = el.querySelector("[data-field='note']");
      if (noteEl) noteEl.textContent = item.note || "";
    }

    if (overnight) {
      fill(overnight, "overnight", r.overnight,
        "<span>Check-in " + r.overnight.checkIn + "</span><span>Check-out " + r.overnight.checkOut + "</span>");
    }
    if (day) {
      fill(day, "day", r.day,
        "<span>Check-in " + r.day.checkIn + "</span><span>Check-out " + r.day.checkOut + "</span>");
    }
    if (early) {
      fill(early, "earlyCheckIn", r.earlyCheckIn,
        "<span>Available from " + r.earlyCheckIn.availableFrom + "</span>");
    }

    var specials = mount.querySelector("[data-field='specialsNote']");
    if (specials) specials.textContent = r.specialsNote;
    var shortStay = document.querySelector("[data-field='shortStayNote']");
    if (shortStay) shortStay.textContent = r.shortStayNote;

    document.querySelectorAll("[data-field='overnightPriceInline']").forEach(function (el) {
      el.textContent = fmtPrice(r.overnight.price);
    });
  }

  /* ---------------- Rooms rendering ---------------- */
  function renderRooms(data) {
    var mount = document.querySelector("[data-rooms]");
    if (!mount) return;
    var tpl = document.querySelector("#room-card-template");
    if (!tpl) return;

    data.rooms.forEach(function (room) {
      var node = tpl.content.cloneNode(true);
      var photo = node.querySelector(".ph-photo");
      photo.classList.add("tone-" + room.imageTone);
      photo.querySelector(".ph-tag").textContent = room.name;
      photo.setAttribute("role", "img");
      photo.setAttribute("aria-label", room.imageAlt);

      node.querySelector("[data-field='name']").textContent = room.name;
      node.querySelector("[data-field='description']").textContent = room.description;

      var featuresList = node.querySelector("[data-field='features']");
      room.features.forEach(function (f) {
        var li = document.createElement("li");
        li.textContent = f;
        featuresList.appendChild(li);
      });

      node.querySelector("[data-field='price']").innerHTML =
        "<strong>" + fmtPrice(room.priceFrom) + "</strong><span>" + room.priceUnit + "</span>";

      mount.appendChild(node);
    });
  }

  /* ---------------- Facilities rendering (home preview) ---------------- */
  function renderFacilitiesPreview(data) {
    var mount = document.querySelector("[data-facilities-preview]");
    if (!mount) return;
    var tpl = document.querySelector("#facility-card-template");
    if (!tpl) return;
    data.facilities.forEach(function (f) {
      var node = tpl.content.cloneNode(true);
      var iconMount = node.querySelector("[data-field='icon']");
      var svg = document.querySelector("#icon-" + f.icon);
      if (svg && iconMount) iconMount.appendChild(svg.cloneNode(true));
      node.querySelector("[data-field='name']").textContent = f.name;
      node.querySelector("[data-field='description']").textContent = f.description;
      mount.appendChild(node);
    });
  }

  /* ---------------- Business info binds (phone/email/address everywhere) ---------------- */
  function renderBusinessInfo(data) {
    var b = data.business;
    document.querySelectorAll("[data-field='phoneDisplay']").forEach(function (el) { el.textContent = b.phoneDisplay; });
    document.querySelectorAll("a[data-field='phoneHref']").forEach(function (el) { el.href = "tel:" + b.phoneHref; });
    document.querySelectorAll("a[data-field='emailHref']").forEach(function (el) {
      el.href = "mailto:" + b.email;
      if (el.dataset.showText === "true") el.textContent = b.email;
    });
    document.querySelectorAll("a[data-field='mapsHref']").forEach(function (el) { el.href = b.mapsUrl; });
    document.querySelectorAll("[data-field='addressFull']").forEach(function (el) { el.textContent = b.address.full; });
    document.querySelectorAll("iframe[data-field='mapEmbed']").forEach(function (el) { el.src = b.mapsEmbedUrl; });
  }

  /* ---------------- Enquiry form ---------------- */
  function initForm() {
    var form = document.querySelector("#enquiry-form");
    if (!form) return;
    var statusBox = form.querySelector(".form-status");
    var submitBtn = form.querySelector("[type='submit']");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusBox.classList.remove("show", "success", "error");

      var payload = {
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        message: form.message.value.trim(),
        company: form.company ? form.company.value.trim() : "",
        source: form.dataset.source || "website enquiry form"
      };

      if (!payload.firstName || !payload.email || !payload.phone || !payload.message) {
        statusBox.textContent = "Please fill in all required fields.";
        statusBox.classList.add("show", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      fetch("/.netlify/functions/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed");
          return res.json().catch(function () { return {}; });
        })
        .then(function () {
          form.reset();
          form.hidden = true;
          statusBox.textContent = "Thank you. Your enquiry has been received. Kings Park Lodge will contact you shortly.";
          statusBox.classList.add("show", "success");
        })
        .catch(function () {
          statusBox.innerHTML =
            "Sorry, something went wrong sending your enquiry. Please call us on " +
            "<a href='tel:+27313032887'>031 303 2887</a> or email " +
            "<a href='mailto:info@kingsparklodge.co.za'>info@kingsparklodge.co.za</a>.";
          statusBox.classList.add("show", "error");
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Enquiry";
        });
    });
  }

  /* ---------------- Active nav link ---------------- */
  function markActiveNav() {
    var path = location.pathname.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
    document.querySelectorAll("[data-nav-link]").forEach(function (a) {
      var href = a.getAttribute("href").replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
      if (href === path) a.classList.add("active");
    });
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initForm();
    markActiveNav();

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    fetchData()
      .then(function (data) {
        renderBusinessInfo(data);
        renderRates(data);
        renderRooms(data);
        renderFacilitiesPreview(data);
      })
      .catch(function (err) {
        console.warn("Site data failed to load:", err);
      });
  });
})();
