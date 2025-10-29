document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const navAnchors = document.querySelectorAll(".nav-links a");
  const scrollLinks = document.querySelectorAll('a[href^="#"]');
  const fadeElements = document.querySelectorAll(".fade-in");
  const yearEl = document.getElementById("year");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      navLinks.classList.toggle("show", !expanded);
    });

    navAnchors.forEach((anchor) => {
      anchor.addEventListener("click", () => {
        navToggle.setAttribute("aria-expanded", "false");
        navLinks.classList.remove("show");
      });
    });
  }

  scrollLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || !hash.startsWith("#")) {
        return;
      }

      const target = document.querySelector(hash);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  if (fadeElements.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    fadeElements.forEach((el) => observer.observe(el));
  }

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }

  const CHAT_ENDPOINTS = ["https://delayed-rejected-exercises-duties.trycloudflare.com/webhook/55658e4f-bb78-4711-99e6-7850239c5326/chat"];
  const SESSION_KEY = "rfd_chat_session_id";
  const chatForm = document.getElementById("chat-form");
  const chatTextarea = document.getElementById("chat-message");
  const chatMessages = document.getElementById("chat-messages");
  const chatStatus = document.getElementById("chat-status");
  const CONTACT_WEBHOOK_URL =
    "https://delayed-rejected-exercises-duties.trycloudflare.com/webhook/55e08c54-35f6-41ca-bcf7-d32e53e72102";

  if (chatForm && chatTextarea && chatMessages) {
    const storage = window.sessionStorage ?? null;
    let sessionId = storage?.getItem(SESSION_KEY) ?? "";
    if (!sessionId) {
      sessionId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `rfd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        storage?.setItem(SESSION_KEY, sessionId);
      } catch {
        // Ignore storage errors (e.g. private mode)
      }
    }

    const formatTime = (date) =>
      date.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

    const parseMaybeJson = (value) => {
      if (typeof value !== "string") {
        return value;
      }
      const trimmed = value.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return value;
        }
      }
      return value;
    };

    const extractReplyText = (payload) => {
      const preferredKeys = ["reply", "response", "message", "text", "content", "output"];
      const resolve = (input) => {
        if (input == null) {
          return "";
        }

        const parsed = parseMaybeJson(input);

        if (typeof parsed === "string") {
          return parsed;
        }

        if (Array.isArray(parsed) && parsed.length) {
          return resolve(parsed[0]);
        }

        if (typeof parsed === "object") {
          for (const key of preferredKeys) {
            if (key in parsed) {
              const result = resolve(parsed[key]);
              if (result) {
                return result;
              }
            }
          }

          const values = Object.values(parsed);
          for (const value of values) {
            const result = resolve(value);
            if (result) {
              return result;
            }
          }
        }

        return "";
      };

      return resolve(payload);
    };

    const firstTimestamp = chatMessages.querySelector(".message.assistant .timestamp");
    if (firstTimestamp) {
      firstTimestamp.textContent = formatTime(new Date());
    }

    const appendMessage = (role, text) => {
      const message = document.createElement("div");
      message.className = `message ${role}`;

      const meta = document.createElement("div");
      meta.className = "message-meta";

      const sender = document.createElement("span");
      sender.className = "sender";
      sender.textContent = role === "user" ? "Tu" : "RFD · AI";

      const timestamp = document.createElement("time");
      timestamp.className = "timestamp";
      timestamp.dateTime = new Date().toISOString();
      timestamp.textContent = formatTime(new Date());

      meta.append(sender, timestamp);
      message.append(meta);

      const body = document.createElement("p");
      body.textContent = text;
      message.append(body);

      chatMessages.append(message);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const setStatus = (text, isError = false) => {
      if (!chatStatus) {
        return;
      }
      chatStatus.textContent = text ?? "";
      chatStatus.classList.toggle("error", Boolean(isError));
    };

    const toggleFormDisabled = (disabled) => {
      if (disabled) {
        chatForm.classList.add("is-sending");
      } else {
        chatForm.classList.remove("is-sending");
      }
      chatTextarea.disabled = disabled;
      const submitButton = chatForm.querySelector("button[type='submit']");
      if (submitButton) {
        submitButton.disabled = disabled;
      }
    };

    const autoResize = () => {
      chatTextarea.style.height = "auto";
      chatTextarea.style.height = `${Math.min(chatTextarea.scrollHeight, 160)}px`;
    };

    chatTextarea.addEventListener("input", autoResize);

    chatTextarea.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        if (!chatTextarea.disabled) {
          if (typeof chatForm.requestSubmit === "function") {
            chatForm.requestSubmit();
          } else {
            chatForm.dispatchEvent(new Event("submit", { cancelable: true }));
          }
        }
      }
    });
    autoResize();

    chatForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const rawMessage = chatTextarea.value.trim();
      if (!rawMessage) {
        return;
      }

      appendMessage("user", rawMessage);
      chatTextarea.value = "";
      autoResize();

      try {
        toggleFormDisabled(true);
        setStatus("Sto elaborando la risposta...");

        let data = null;
        let success = false;

        for (const endpoint of CHAT_ENDPOINTS) {
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sessionId,
                chatInput: rawMessage,
                source: "website-demo",
              }),
            });

            data = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(data?.error || "Errore durante la richiesta");
            }

            success = true;
            break;
          } catch (endpointError) {
            console.warn(`Endpoint ${endpoint} non disponibile:`, endpointError);
            continue;
          }
        }

        if (!success) {
          throw new Error("Nessun endpoint del chatbot è raggiungibile");
        }

        const aiText = extractReplyText(data) || "Ho elaborato la richiesta, ma non ho ricevuto una risposta testuale.";
        appendMessage("assistant", aiText);
      } catch (error) {
        console.error(error);
        setStatus("Non riesco a connettermi all'agente. Riprova.", true);
        appendMessage("assistant", "Ops, qualcosa è andato storto. Riproviamo fra qualche secondo?");
      } finally {
        toggleFormDisabled(false);
      }
    });
  }

  const contactForm = document.getElementById("contact-form");
  const contactStatus = document.getElementById("contact-status");

  if (contactForm) {
    const contactSubmitButton = contactForm.querySelector("button[type='submit']");

    const setContactStatus = (message, state) => {
      if (!contactStatus) {
        return;
      }
      contactStatus.textContent = message ?? "";
      contactStatus.classList.remove("error", "success");
      if (state === "error") {
        contactStatus.classList.add("error");
      } else if (state === "success") {
        contactStatus.classList.add("success");
      }
    };

    const toggleContactDisabled = (disabled) => {
      if (disabled) {
        contactForm.classList.add("is-sending");
      } else {
        contactForm.classList.remove("is-sending");
      }
      if (contactSubmitButton) {
        contactSubmitButton.disabled = disabled;
      }
      const controls = contactForm.querySelectorAll("input, textarea");
      controls.forEach((control) => {
        control.disabled = disabled;
      });
    };

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(contactForm);
      const payload = {
        nome: (formData.get("nome") ?? "").toString().trim(),
        email: (formData.get("email") ?? "").toString().trim(),
        messaggio: (formData.get("messaggio") ?? "").toString().trim(),
      };

      if (!payload.nome || !payload.email || !payload.messaggio) {
        setContactStatus("Compila tutti i campi richiesti.", "error");
        return;
      }

      try {
        toggleContactDisabled(true);
        setContactStatus("Invio in corso...", null);

        const response = await fetch(CONTACT_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(errorText || "Errore durante l'invio del messaggio.");
        }

        setContactStatus("Messaggio inviato! Ti ricontatterò al più presto.", "success");
        contactForm.reset();
      } catch (error) {
        console.error("Errore durante l'invio del modulo di contatto:", error);
        setContactStatus("Si è verificato un errore. Riprova tra qualche minuto.", "error");
      } finally {
        toggleContactDisabled(false);
      }
    });
  }
});
