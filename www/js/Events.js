/* Novaé — Astronomical events & alerts */
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
            React.createElement("p", null, e.desc)
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
    )
  );
}
