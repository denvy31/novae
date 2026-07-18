/* Novaé — Astronomical events & alerts + fil d'actualités spatiales temps réel */

// Fil d'actualités (Spaceflight News API — CORS ouvert, gratuit). Cache mémoire par session.
function SpaceNews() {
  const { useState, useEffect } = React;
  const I18N = window.NV_I18N;
  const [articles, setArticles] = useState(window.__nvNews || null);
  const [failed, setFailed] = useState(false);
  // les articles sources sont en anglais ; par défaut on les ouvre traduits dans la
  // langue de l'app (Google Translate), avec bascule VO possible
  const lang = I18N.get();
  const [translate, setTranslate] = useState(lang !== "en");
  const artUrl = (u) => (translate && lang !== "en")
    ? "https://translate.google.com/translate?sl=en&tl=" + lang + "&u=" + encodeURIComponent(u)
    : u;

  useEffect(() => {
    if (window.__nvNews) return;
    let mounted = true;
    fetch("https://api.spaceflightnewsapi.net/v4/articles/?limit=8")
      .then((r) => r.json())
      .then((j) => { if (!mounted) return; window.__nvNews = j.results || []; setArticles(window.__nvNews); })
      .catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, []);

  if (failed) return React.createElement("p", { className: "news-off" }, I18N.t("ev_news_off"));
  if (!articles) return React.createElement("p", { className: "news-off" }, "…");

  const fmt = (iso) => { try { return new Date(iso).toLocaleDateString(I18N.locale(), { day: "numeric", month: "short" }); } catch (e) { return ""; } };
  return React.createElement("div", { className: "news-list" },
    lang !== "en" && React.createElement("div", { className: "news-lang-row" },
      React.createElement("button", { className: "chip" + (translate ? " on" : ""), onClick: () => setTranslate(true) }, "🌐 Traduit (" + lang.toUpperCase() + ")"),
      React.createElement("button", { className: "chip" + (!translate ? " on" : ""), onClick: () => setTranslate(false) }, "🇬🇧 VO anglaise")),
    articles.map((a) => React.createElement("a", {
      key: a.id, className: "news-card", href: artUrl(a.url), target: "_blank", rel: "noopener noreferrer",
    },
      a.image_url && React.createElement("img", { className: "news-thumb", src: a.image_url, alt: "", loading: "lazy" }),
      React.createElement("div", { className: "news-body" },
        React.createElement("div", { className: "news-meta" },
          React.createElement("span", { className: "news-site" }, a.news_site),
          React.createElement("span", { className: "news-date" }, fmt(a.published_at))),
        React.createElement("h4", { className: "news-title" }, a.title)))));
}

function EventsPanel() {
  const { useState } = React;
  const NV = window.NV;
  const I18N = window.NV_I18N;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [filter, setFilter] = useState("Tous");

  const types = ["Tous", ...Array.from(new Set(NV.events.map((e) => e.type)))];

  const withCountdown = NV.events.map((e) => {
    const d = new Date(e.date + "T00:00:00");
    const days = Math.round((d - today) / 86400000);
    return { ...e, days, d };
  }).sort((a, b) => a.days - b.days);

  const list = filter === "Tous" ? withCountdown : withCountdown.filter((e) => e.type === filter);

  return React.createElement("div", { className: "events-wrap" },
    React.createElement("div", { className: "events-filters" },
      types.map((t) =>
        React.createElement("button", {
          key: t, className: "chip" + (filter === t ? " on" : ""),
          onClick: () => setFilter(t),
        }, t === "Tous" ? I18N.t("ev_all") : t))
    ),

    React.createElement("div", { className: "events-list" },
      list.map((e, i) =>
        React.createElement("div", { key: i, className: "event-card" },
          React.createElement("div", { className: "event-icon" }, e.icon),
          React.createElement("div", { className: "event-body" },
            React.createElement("div", { className: "event-top" },
              React.createElement("span", { className: "event-type" }, e.type),
              React.createElement("span", { className: "event-date" },
                e.d.toLocaleDateString(I18N.locale(), { day: "numeric", month: "short", year: "numeric" }))
            ),
            React.createElement("h4", null, e.title),
            React.createElement("p", null, e.desc),
            e.where && React.createElement("p", { className: "event-where" }, "📍 " + e.where)
          ),
          React.createElement("div", { className: "event-countdown" },
            e.days < 0
              ? React.createElement("span", { className: "past" }, I18N.t("ev_past"))
              : e.days === 0
                ? React.createElement("span", { className: "soon" }, I18N.t("ev_today"))
                : React.createElement(React.Fragment, null,
                    React.createElement("strong", null, "J−" + e.days),
                    React.createElement("span", null, e.days === 1 ? I18N.t("ev_day") : I18N.t("ev_days")))
          )
        ))
    ),

    React.createElement("h3", { className: "news-head" }, "🛰 " + I18N.t("ev_news")),
    React.createElement(SpaceNews)
  );
}
