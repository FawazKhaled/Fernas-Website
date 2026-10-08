/* Fernas — site behaviour.
   Plain JavaScript, no dependencies, no build step. Each module looks for its
   own markup and returns early when the page does not have it, so this one
   file serves every page. All content works without JavaScript; these
   modules only enhance it. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $$(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  /* Disabled-looking but still focusable, so keyboard focus is never lost. */
  function setDisabled(button, disabled) {
    if (!button) return;
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
  }
  function isDisabled(button) { return button.getAttribute("aria-disabled") === "true"; }

  function onSwipe(el, handler) {
    var startX = null, startY = 0;
    el.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) handler(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  var CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* -------------------------------------------------------------- Load state */

  function initLoadState() {
    var ready = function () {
      requestAnimationFrame(function () {
        document.body.classList.add("is-ready");
      });
    };

    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });
  }

  /* ---------------------------------------------------------------- Menu */

  function initMenu() {
    var header = $(".site-header");
    var toggle = header && $(".menu-toggle", header);
    if (!toggle) return;
    var label = $(".visually-hidden", toggle);

    function setOpen(open) {
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      label.textContent = open ? "Close menu" : "Open menu";
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (header.classList.contains("is-open") && !header.contains(e.target)) setOpen(false);
    });
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (e) {
      if (e.matches) setOpen(false);
    });
  }

  /* ------------------------------------------------- Reveal & image fade */

  function initReveal() {
    $$("img[data-fade]").forEach(function (img) {
      function done() { img.classList.add("is-loaded"); }
      if (img.complete && img.naturalWidth) done();
      else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });

    var items = $$("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      root.classList.add("reveal-ready");
      return;
    }

    /* Whatever is already on screen shows immediately; the rest eases in. */
    var fold = window.innerHeight;
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < fold) el.classList.add("is-visible");
    });
    root.classList.add("reveal-ready");

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) {
      if (!el.classList.contains("is-visible")) observer.observe(el);
    });
  }

  /* ------------------------------------------------------------ Lightbox */

  function openLightbox(img, trigger) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", img.alt);

    var close = document.createElement("button");
    close.type = "button";
    close.className = "icon-btn lightbox__close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = CLOSE_ICON;

    var big = document.createElement("img");
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;

    box.appendChild(close);
    box.appendChild(big);

    function shut() {
      box.remove();
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (trigger) trigger.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") shut();
      if (e.key === "Tab") { e.preventDefault(); close.focus(); }
    }

    box.addEventListener("click", function (e) { if (e.target !== big) shut(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(box);
    document.body.style.overflow = "hidden";
    close.focus();
  }

  /* --------------------------------------------------------------- Comic */

  function initComic() {
    var comic = $("[data-comic]");
    if (!comic) return;
    var book = $(".comic__book", comic);
    var pages = $$(".cp", book);
    var counts = $$("[data-comic-count]", comic);
    var prevs = $$("[data-comic-prev]", comic);
    var nexts = $$("[data-comic-next]", comic);
    var wide = window.matchMedia("(min-width: 900px)");
    var mode = null, sheets = [], k = 0, max = 0, settle = null;

    function div(className) {
      var el = document.createElement("div");
      el.className = className;
      return el;
    }

    /* Book: cover on the left, last page on the right, the pages between
       printed on both sides of the turning sheets. Stack: one sheet per page. */
    function build() {
      var previous = mode;
      mode = wide.matches ? "book" : "stack";
      if (previous === mode) return;
      if (previous === "book") k = 2 * k;
      else if (previous === "stack") k = Math.floor(k / 2);

      book.textContent = "";
      sheets = [];
      book.setAttribute("data-mode", mode);

      if (mode === "book") {
        var left = div("comic__base comic__base--left");
        var right = div("comic__base comic__base--right");
        left.appendChild(pages[0]);
        right.appendChild(pages[pages.length - 1]);
        book.appendChild(left);
        book.appendChild(right);
        for (var i = 1; i < pages.length - 1; i += 2) {
          var sheet = div("comic__sheet");
          var front = div("comic__face comic__face--front");
          var back = div("comic__face comic__face--back");
          front.appendChild(pages[i]);
          if (i + 1 < pages.length - 1) back.appendChild(pages[i + 1]);
          sheet.appendChild(front);
          sheet.appendChild(back);
          book.appendChild(sheet);
          sheets.push(sheet);
        }
        book.appendChild(div("comic__spine"));
        max = sheets.length;
      } else {
        pages.forEach(function (page) {
          var sheet = div("comic__sheet");
          sheet.appendChild(page);
          book.appendChild(sheet);
          sheets.push(sheet);
        });
        max = sheets.length - 1;
      }
      k = Math.max(0, Math.min(k, max));
      apply(-1);
    }

    function visiblePages() {
      return mode === "book" ? [2 * k + 1, 2 * k + 2] : [k + 1];
    }

    function apply(moving) {
      var n = sheets.length;
      sheets.forEach(function (sheet, i) {
        var flipped = i < k;
        sheet.classList.toggle("is-flipped", flipped);
        sheet.style.zIndex = String(i === moving ? n + 5 : (mode === "book" && flipped ? i + 1 : n - i));
      });
      var visible = visiblePages();
      pages.forEach(function (page, i) {
        var on = visible.indexOf(i + 1) !== -1;
        page.inert = !on;
        if (!on) {
          var video = $("video", page);
          if (video && !video.paused) video.pause();
        }
      });
      var label = (visible.length > 1 ? visible[0] + "–" + visible[1] : visible[0]) + " / " + pages.length;
      counts.forEach(function (c) { c.textContent = label; });
      prevs.forEach(function (b) { setDisabled(b, k === 0); });
      nexts.forEach(function (b) { setDisabled(b, k === max); });
    }

    function go(direction) {
      var next = Math.max(0, Math.min(max, k + direction));
      if (next === k) return;
      var moving = direction > 0 ? k : next;
      k = next;
      apply(moving);
      clearTimeout(settle);
      settle = setTimeout(function () { apply(-1); }, 950);
    }

    comic.addEventListener("click", function (e) {
      var prev = e.target.closest("[data-comic-prev]");
      var next = e.target.closest("[data-comic-next]");
      var zoom = e.target.closest(".cp__zoom");
      if (prev && !isDisabled(prev)) go(-1);
      else if (next && !isDisabled(next)) go(1);
      else if (zoom) openLightbox($("img", zoom), zoom);
    });
    comic.addEventListener("keydown", function (e) {
      if (e.target.closest("video")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    });
    onSwipe(book, go);

    /* The poster hides behind a play button; native controls take over once
       the video starts, so pausing and seeking work with any input. */
    $$(".cp__video-panel", book).forEach(function (panel) {
      var video = $(".cp__video", panel);
      var play = $(".cp__play", panel);
      if (!video || !play) return;
      video.controls = false;
      play.addEventListener("click", function () {
        video.controls = true;
        play.hidden = true;
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
        video.focus();
      });
    });

    build();
    comic.classList.add("is-ready");
    wide.addEventListener("change", build);
  }

  /* ------------------------------------------------------------ Carousel */

  function initCarousel() {
    var carousel = $("[data-carousel]");
    if (!carousel) return;
    var track = $(".carousel__track", carousel);
    var slides = $$(".carousel__slide", track);
    var tabs = $$('[role="tab"]', carousel);
    var count = $("[data-carousel-count]", carousel);
    var prev = $("[data-carousel-prev]", carousel);
    var next = $("[data-carousel-next]", carousel);
    var n = slides.length, index = 0;

    function pad(v) { return (v < 10 ? "0" : "") + v; }

    slides.forEach(function (slide, i) {
      slide.setAttribute("role", "tabpanel");
      slide.setAttribute("aria-labelledby", tabs[i].id);
    });

    function show(i, focusTab) {
      index = Math.max(0, Math.min(n - 1, i));
      track.style.transform = "translateX(" + (-index * 100) + "%)";
      slides.forEach(function (slide, j) {
        slide.classList.toggle("is-off", j !== index);
        slide.inert = j !== index;
      });
      tabs.forEach(function (tab, j) {
        tab.setAttribute("aria-selected", String(j === index));
        tab.tabIndex = j === index ? 0 : -1;
      });
      if (focusTab) tabs[index].focus();
      count.textContent = pad(index + 1) + " / " + pad(n);
      setDisabled(prev, index === 0);
      setDisabled(next, index === n - 1);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { show(i); });
      tab.addEventListener("keydown", function (e) {
        var target = null;
        if (e.key === "ArrowRight") target = (i + 1) % n;
        if (e.key === "ArrowLeft") target = (i - 1 + n) % n;
        if (e.key === "Home") target = 0;
        if (e.key === "End") target = n - 1;
        if (target === null) return;
        e.preventDefault();
        show(target, true);
      });
    });
    prev.addEventListener("click", function () { if (!isDisabled(prev)) show(index - 1); });
    next.addEventListener("click", function () { if (!isDisabled(next)) show(index + 1); });
    onSwipe(track, function (d) { show(index + d); });

    /* Deep links such as projects.html#masar open on that project. */
    var start = 0;
    slides.forEach(function (slide, i) { if ("#" + slide.id === location.hash) start = i; });

    track.style.transition = "none";
    show(start);
    carousel.classList.add("is-ready");
    void track.offsetWidth;
    track.style.transition = "";
  }

  /* ------------------------------------------------------------ Mascot */

  function initMascot() {
    var trigger = $("[data-mascot-trigger]");
    var bubble = $("[data-mascot-bubble]");
    if (!trigger || !bubble) return;

    var messages = [
      "Stop it!",
      "Hey!",
      "Don't!",
      "Don't do that!",
      "Stop bugging me!",
      "What do you want!?",
      "do you really need to do that?",
      "LAST WARNING!"
    ];
    var finalMessage = "If you got free time write an idea instead of annoying me";
    var index = 0;
    var activated = false;
    var audioContext = null;

    function playTone() {
      var AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioContext) audioContext = new AudioCtor();
      if (audioContext.state === "suspended") audioContext.resume();

      var osc = audioContext.createOscillator();
      var gain = audioContext.createGain();
      osc.type = "square";
      osc.frequency.value = 180;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(audioContext.destination);

      var now = audioContext.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.16);
    }

    function showBubble(text, isFinal) {
      bubble.textContent = text;
      bubble.classList.add("is-visible");
      bubble.classList.toggle("is-final", !!isFinal);
      bubble.setAttribute("aria-label", text);
      clearTimeout(showBubble.timeoutId);
      showBubble.timeoutId = setTimeout(function () {
        bubble.classList.remove("is-visible");
      }, isFinal ? 1800 : 900);
    }

    trigger.addEventListener("click", function () {
      if (activated) return;
      playTone();

      if (index >= messages.length) {
        activated = true;
        showBubble(finalMessage, true);
        setTimeout(function () {
          window.location.assign("contact.html");
        }, 1800);
        return;
      }

      var message = messages[index];
      showBubble(message, index === messages.length - 1);
      index += 1;
    });
  }

  /* ---------------------------------------------------------------- Team */

  function initTeam() {
    var stage = $("[data-team-stage]");
    if (!stage) return;
    var dialogue = $(".dialogue", stage);
    var live = $("[data-team-live]", stage);
    var skipBtn = $("[data-team-skip]", stage);
    var replayBtn = $("[data-team-replay]", stage);
    var soundBtn = $("[data-team-sound]", stage);
    var blipSrc = stage.getAttribute("data-blip");

    var rows = {}, cards = {};
    $$(".dialogue__row", stage).forEach(function (r) { rows[r.getAttribute("data-who")] = r; });
    $$(".roster__card", stage).forEach(function (c) { cards[c.getAttribute("data-for")] = c; });
    var steps = $$(".dialogue__script > li", stage).map(function (li) {
      return {
        say: li.getAttribute("data-say"),
        enter: li.getAttribute("data-enter"),
        exit: li.getAttribute("data-exit"),
        text: li.textContent.trim()
      };
    });
    var closing = steps.filter(function (s) { return s.say === "fernas"; }).pop();

    var run = 0, advance = null;
    var part = function (row, name) { return $(".dialogue__" + name, row); };

    /* Sound is off until the visitor turns it on; the choice is remembered. */
    var muted = true, audio = null, buffer = null;
    try { muted = localStorage.getItem("fernas-sound") !== "on"; } catch (err) {}

    function ensureAudio() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audio) {
        try { audio = new AC(); } catch (err) { return; }
        if (blipSrc) {
          fetch(blipSrc)
            .then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
            .then(function (data) { return new Promise(function (ok, fail) { audio.decodeAudioData(data, ok, fail); }); })
            .then(function (decoded) { buffer = decoded; })
            .catch(function () {});
        }
      }
      if (audio.state !== "running" && audio.resume) {
        var r = audio.resume();
        if (r && r.catch) r.catch(function () {});
      }
      /* iOS only unlocks output after a sound starts inside a gesture. */
      try {
        var silent = audio.createBufferSource();
        silent.buffer = audio.createBuffer(1, 1, 22050);
        silent.connect(audio.destination);
        silent.start(0);
      } catch (err) {}
    }
    function blip(rate) {
      if (muted || !audio) return;
      if (audio.state !== "running") {
        if (audio.resume) { var r = audio.resume(); if (r && r.catch) r.catch(function () {}); }
        return;
      }
      try {
        var gain = audio.createGain();
        gain.connect(audio.destination);
        var t = audio.currentTime;
        if (buffer) {
          var src = audio.createBufferSource();
          src.buffer = buffer;
          src.playbackRate.value = rate;
          gain.gain.value = 0.45;
          src.connect(gain);
          src.start(t);
        } else {
          /* The sample hasn't loaded (or can't, e.g. opened from disk): synthesise the blip. */
          var osc = audio.createOscillator();
          osc.type = "square";
          osc.frequency.value = 520 * rate;
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
          osc.connect(gain);
          osc.start(t);
          osc.stop(t + 0.035);
        }
      } catch (err) {}
    }
    function paintSound() {
      soundBtn.textContent = muted ? "Sound: off" : "Sound: on";
      soundBtn.setAttribute("aria-pressed", String(!muted));
    }
    soundBtn.addEventListener("click", function () {
      muted = !muted;
      if (!muted) ensureAudio();
      try { localStorage.setItem("fernas-sound", muted ? "off" : "on"); } catch (err) {}
      paintSound();
    });
    /* Browsers keep audio locked until a gesture, so unlock on the first one. */
    var unlock = function () {
      if (muted) return;
      ensureAudio();
      if (audio && audio.state === "running") {
        document.removeEventListener("pointerdown", unlock, true);
        document.removeEventListener("keydown", unlock, true);
        document.removeEventListener("touchend", unlock, true);
      }
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("touchend", unlock, true);
    paintSound();

    function flag(row, token, on) {
      var list = (row.getAttribute("data-s") || "").split(" ").filter(function (x) { return x && x !== token; });
      if (on) list.push(token);
      row.setAttribute("data-s", list.join(" "));
    }
    /* A pause that a click on the dialogue can cut short. */
    function wait(ms) {
      return new Promise(function (resolve) {
        var timer = setTimeout(done, ms);
        function done() { clearTimeout(timer); if (advance === done) advance = null; resolve(); }
        advance = done;
      });
    }

    async function enter(id, row) {
      row.setAttribute("data-s", "");
      void row.offsetWidth;
      flag(row, "in", true);
      await wait(reduceMotion ? 0 : 700);
      if (id !== run) return;
      flag(row, "side", true);
      await wait(reduceMotion ? 0 : 760);
      if (id !== run) return;
      flag(row, "talk", true);
    }

    async function say(id, row, text) {
      var typed = part(row, "typed");
      var rate = row === rows.fernas ? 1 : 0.8;
      part(row, "ghost").textContent = text;
      typed.textContent = "";
      live.textContent = row.getAttribute("data-name") + ": " + text;
      flag(row, "wait", false);
      flag(row, "typing", true);
      var fast = reduceMotion;
      advance = function () { fast = true; };
      for (var i = 1; i <= text.length && !fast; i++) {
        if (id !== run) return;
        typed.textContent = text.slice(0, i);
        var ch = text.charAt(i - 1);
        if (ch !== " " && i % 2 === 1) blip(rate);
        await sleep(/[.!?:]/.test(ch) ? 230 : ch === "," ? 120 : 32);
      }
      if (id !== run) return;
      typed.textContent = text;
      advance = null;
      flag(row, "typing", false);
      flag(row, "wait", true);
      await wait(Math.max(1300, text.length * 32));
      if (id !== run) return;
      flag(row, "wait", false);
    }

    /* The speaker's avatar flies into their roster card, which unlocks. */
    async function exit(id, row) {
      var card = cards[row.getAttribute("data-who")];
      var from = part(row, "ava").getBoundingClientRect();
      flag(row, "out", true);
      if (card) {
        card.classList.remove("is-locked");
        var avatar = $(".roster__ava", card);
        if (!reduceMotion) {
          var to = avatar.getBoundingClientRect();
          avatar.style.transition = "none";
          avatar.style.transformOrigin = "0 0";
          avatar.style.transform = "translate(" + (from.left - to.left) + "px," + (from.top - to.top) + "px) scale(" + (from.width / to.width) + ")";
          void avatar.offsetWidth;
          avatar.style.transition = "transform 640ms cubic-bezier(.3,.9,.3,1)";
          avatar.style.transform = "none";
        }
      }
      await wait(reduceMotion ? 0 : 660);
      if (id !== run) return;
      row.removeAttribute("data-s");
    }

    function reset() {
      Object.keys(cards).forEach(function (key) { cards[key].classList.add("is-locked"); });
      Object.keys(rows).forEach(function (key) {
        rows[key].removeAttribute("data-s");
        part(rows[key], "ghost").textContent = "";
        part(rows[key], "typed").textContent = "";
      });
    }

    function finished(done) {
      stage.classList.toggle("is-done", done);
      skipBtn.hidden = done;
      replayBtn.hidden = !done;
    }

    async function play() {
      var id = ++run;
      finished(false);
      reset();
      await wait(reduceMotion ? 0 : 500);
      for (var i = 0; i < steps.length; i++) {
        if (id !== run) return;
        var step = steps[i];
        if (step.enter) await enter(id, rows[step.enter]);
        else if (step.say) await say(id, rows[step.say], step.text);
        else if (step.exit) await exit(id, rows[step.exit]);
      }
      if (id === run) finished(true);
    }

    function skip() {
      run++;
      if (advance) advance();
      Object.keys(rows).forEach(function (key) {
        if (key !== "fernas") rows[key].removeAttribute("data-s");
      });
      Object.keys(cards).forEach(function (key) { cards[key].classList.remove("is-locked"); });
      var fernas = rows.fernas;
      part(fernas, "ghost").textContent = closing.text;
      part(fernas, "typed").textContent = closing.text;
      fernas.setAttribute("data-s", "in side talk");
      live.textContent = "Showing the full team.";
      finished(true);
    }

    dialogue.addEventListener("click", function () { if (advance) advance(); });
    skipBtn.addEventListener("click", function () { skip(); replayBtn.focus(); });
    replayBtn.addEventListener("click", function () { play(); skipBtn.focus(); });

    /* Lock every card first so the roster never jumps, then start the
       intro once the stage is actually on screen. */
    reset();
    if (!("IntersectionObserver" in window)) { play(); return; }
    var started = false;
    var observer = new IntersectionObserver(function (entries) {
      if (started || !entries[0].isIntersecting) return;
      started = true;
      observer.disconnect();
      play();
    }, { threshold: 0.25 });
    observer.observe(dialogue);
  }

  /* ------------------------------------------------------------- Contact */

  function initContact() {
    var form = $("[data-contact-form]");
    if (!form) return;
    var endpoint = form.getAttribute("data-endpoint");
    var email = form.getAttribute("data-email");
    var submit = $('button[type="submit"]', form);
    var submitLabel = $(".btn__label", submit);
    var alertBox = $("[data-form-alert]", form);
    var alertText = $("[data-form-alert-text]", form);
    var mailto = $("[data-form-mailto]", form);
    var success = $("[data-form-success]");
    var again = $("[data-form-again]");
    var sending = false;

    form.noValidate = true;

    var rules = {
      name: function (v) { return v ? "" : "Please enter your name."; },
      email: function (v) {
        if (!v) return "Please enter your email address.";
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Please enter a valid email address, like name@example.com.";
      },
      phone: function (v) {
        if (!v) return "Please enter your phone number.";
        return v.replace(/\D/g, "").length >= 7 ? "" : "Please enter a phone number with at least 7 digits.";
      },
      idea: function (v) { return v ? "" : "Please describe your idea or message."; }
    };

    function check(input) {
      var message = rules[input.name](input.value.trim());
      var error = document.getElementById(input.id + "-error");
      input.setAttribute("aria-invalid", message ? "true" : "false");
      error.textContent = message;
      return !message;
    }

    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      input.addEventListener("blur", function () { if (input.value.trim()) check(input); });
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") check(input);
      });
    });

    function setSending(on) {
      sending = on;
      submit.disabled = on;
      submit.setAttribute("aria-busy", String(on));
      var spinner = $(".btn__spinner", submit);
      if (on && !spinner) {
        spinner = document.createElement("span");
        spinner.className = "btn__spinner";
        spinner.setAttribute("aria-hidden", "true");
        submit.insertBefore(spinner, submitLabel);
      } else if (!on && spinner) {
        spinner.remove();
      }
      submitLabel.textContent = on ? "Sending…" : "Submit idea";
    }

    function showSuccess(focus) {
      form.hidden = true;
      success.hidden = false;
      if (focus) success.focus();
    }

    function showError(message, data) {
      var body = "Name: " + data.name + "\nEmail: " + data.email + "\nPhone: " + data.phone + "\n\n" + data.idea;
      mailto.href = "mailto:" + email + "?subject=" + encodeURIComponent(data._subject) + "&body=" + encodeURIComponent(body);
      alertBox.hidden = false;
      alertText.textContent = message;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      alertBox.hidden = true;

      var firstInvalid = null;
      Object.keys(rules).forEach(function (name) {
        var input = form.elements[name];
        if (!check(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) { firstInvalid.focus(); return; }

      var data = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        idea: form.elements.idea.value.trim(),
        _honey: form.elements._honey.value,
        _subject: "New idea from " + form.elements.name.value.trim(),
        _template: "table"
      };

      if (location.protocol === "file:") {
        showError("Sending only works on the published website. You can email your message to us instead; it is ready to go.", data);
        return;
      }

      setSending(true);
      var controller = "AbortController" in window ? new AbortController() : null;
      var timeout = setTimeout(function () { if (controller) controller.abort(); }, 15000);

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
        signal: controller ? controller.signal : undefined
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (json) {
          if (String(json.success) !== "true") throw new Error(json.message || "Not delivered");
          setSending(false);
          form.reset();
          showSuccess(true);
        })
        .catch(function () {
          setSending(false);
          showError("We could not send your message just now. You can email it to us instead; it is ready to go.", data);
        })
        .then(function () { clearTimeout(timeout); });
    });

    again.addEventListener("click", function () {
      success.hidden = true;
      form.hidden = false;
      form.elements.name.focus();
    });

    /* Return from the no-JavaScript fallback (formsubmit redirects here). */
    if (new URLSearchParams(location.search).get("sent") === "1") showSuccess(false);
  }

  /* --------------------------------------------------------------- Footer */

  function initYear() {
    var year = String(new Date().getFullYear());
    $$("[data-year]").forEach(function (el) { el.textContent = year; });
  }

  initLoadState();
  initMenu();
  initYear();
  initComic();
  initCarousel();
  initTeam();
  initContact();
  initMascot();
  initReveal();
})();
