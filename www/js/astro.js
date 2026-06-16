/* Novaé — astronomy wrapper around astronomy-engine (real ephemerides + alt/az) */
(function () {
  const D = Math.PI / 180;
  const A = () => window.Astronomy;

  // local apparent sidereal time (hours) for a longitude (deg, east +)
  function lstHours(date, lonDeg) {
    return A().SiderealTime(A().MakeTime(date)) + lonDeg / 15;
  }

  // fixed RA(deg)/Dec(deg) -> horizontal {alt,az} (deg). Fast; matches AE Horizon to 0.01°.
  function altaz(raDeg, decDeg, lstH, latDeg) {
    const H = ((lstH - raDeg / 15) * 15) * D;
    const dec = decDeg * D, la = latDeg * D;
    const sinAlt = Math.sin(dec) * Math.sin(la) + Math.cos(dec) * Math.cos(la) * Math.cos(H);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    let cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(la)) / (Math.cos(alt) * Math.cos(la));
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
    if (Math.sin(H) > 0) az = 2 * Math.PI - az;
    return { alt: alt / D, az: az / D };
  }

  function observer(lat, lon, elev) { return new (A().Observer)(lat, lon, elev || 0); }

  // equatorial position of a solar-system body -> {ra:deg, dec:deg, distAU}
  function bodyEqu(name, date, obs) {
    const eq = A().Equator(A().Body[name], A().MakeTime(date), obs, true, true);
    return { ra: eq.ra * 15, dec: eq.dec, dist: eq.dist };
  }

  // heliocentric ecliptic vector (AU) for top-down solar-system view
  function helio(name, date) {
    const v = A().HelioVector(A().Body[name], A().MakeTime(date));
    return { x: v.x, y: v.y, z: v.z };
  }

  // Moon illumination phase angle (0 new, 90 first quarter, 180 full, 270 last)
  function moonPhase(date) { return A().MoonPhase(A().MakeTime(date)); }

  // rise/set search for a body (returns Date or null)
  function riseSet(name, date, obs, direction) {
    try {
      const ev = A().SearchRiseSet(A().Body[name], obs, direction, A().MakeTime(date), 1);
      return ev ? ev.date : null;
    } catch (e) { return null; }
  }

  window.NVAstro = {
    ready: () => !!window.Astronomy,
    D, lstHours, altaz, observer, bodyEqu, helio, moonPhase, riseSet,
  };
})();
