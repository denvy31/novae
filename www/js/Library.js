/* Novaé — Bibliothèque personnelle (captures + métadonnées, localStorage) */
(function () {
  const KEY = "novae_captures_v1";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }

  window.NVLibrary = {
    list: load,
    capture(canvas, meta) {
      let img;
      try { img = canvas.toDataURL("image/jpeg", 0.7); } catch (e) { return; }
      const list = load();
      list.unshift({ id: Date.now(), img, date: meta.date, place: meta.place, lat: meta.lat, lon: meta.lon });
      save(list.slice(0, 60)); // cap
      window.dispatchEvent(new Event("novae-captures"));
    },
    remove(id) { save(load().filter((c) => c.id !== id)); window.dispatchEvent(new Event("novae-captures")); },
    clear() { save([]); window.dispatchEvent(new Event("novae-captures")); },
  };
})();

function LibraryPanel() {
  const { useState, useEffect } = React;
  const [items, setItems] = useState(window.NVLibrary.list());
  const [view, setView] = useState(null);
  useEffect(() => {
    const on = () => setItems(window.NVLibrary.list());
    window.addEventListener("novae-captures", on);
    return () => window.removeEventListener("novae-captures", on);
  }, []);

  const fmt = (iso) => { try { return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return iso; } };

  if (!items.length) {
    return React.createElement("div", { className: "library-empty" },
      React.createElement("div", { className: "lib-empty-icon" }, "📷"),
      React.createElement("h3", null, "Bibliothèque vide"),
      React.createElement("p", null, "Dans l'onglet Ciel, touchez « 📸 Capturer » pour enregistrer une vue du ciel avec sa date, son lieu et ses coordonnées."));
  }

  return React.createElement("div", { className: "library-wrap" },
    React.createElement("div", { className: "library-head" },
      React.createElement("span", null, items.length + " capture" + (items.length > 1 ? "s" : "")),
      React.createElement("button", { className: "lib-clear", onClick: () => { if (confirm("Tout supprimer ?")) window.NVLibrary.clear(); } }, "Tout effacer")),
    React.createElement("div", { className: "library-grid" },
      items.map((c) => React.createElement("div", { key: c.id, className: "lib-card" },
        React.createElement("img", { src: c.img, alt: "capture", onClick: () => setView(c) }),
        React.createElement("div", { className: "lib-meta" },
          React.createElement("div", { className: "lib-date" }, fmt(c.date)),
          React.createElement("div", { className: "lib-place" }, "📍 " + (c.place || "—"))),
        React.createElement("button", { className: "lib-del", onClick: () => window.NVLibrary.remove(c.id) }, "×")))),
    view && React.createElement("div", { className: "lib-viewer", onClick: () => setView(null) },
      React.createElement("img", { src: view.img, alt: "capture" }),
      React.createElement("div", { className: "lib-viewer-meta" }, fmt(view.date) + " · 📍 " + (view.place || "—") + " (" + view.lat.toFixed(3) + "°, " + view.lon.toFixed(3) + "°)"))
  );
}
