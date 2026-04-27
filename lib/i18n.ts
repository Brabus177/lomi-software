// All user-facing strings. One source of truth so the app stays consistent.
export const t = {
  appName: "Lomi Útvonalkövető",
  tagline: "Csapatok útvonalainak követése terepen",

  nav: {
    admin: "Admin",
    maps: "Térképek",
    newSession: "Új menet",
    home: "Kezdőlap",
  },

  home: {
    title: "Lomi Útvonalkövető",
    description:
      "Terepi szemétgyűjtő útvonalkövető. Az adminisztrátor naponta menetet hoz létre, a csapatok pedig telefonon nyitják meg a számukra küldött linket.",
    adminCta: "Admin belépés",
    teamHint: "Csapat vagy? Nyisd meg az admin által küldött linket.",
  },

  login: {
    title: "Admin bejelentkezés",
    descriptionPassword: "Add meg az e-mail címed és a jelszavad.",
    descriptionMagic: "Add meg az e-mail címed — küldünk egy bejelentkezési linket.",
    email: "E-mail cím",
    password: "Jelszó",
    submitPassword: "Bejelentkezés",
    submitMagic: "Bejelentkezési link küldése",
    submitting: "Küldés…",
    sent: "Megnyitottuk a postafiókod — kattints a linkre.",
    switchToMagic: "inkább bejelentkezési link",
    switchToPassword: "inkább jelszóval",
  },

  admin: {
    sessionsTitle: "Menetek",
    newSession: "Új menet",
    emptySessionsBefore: "Még nincs menet. Először",
    emptySessionsLink: "tölts fel egy térképet",
    emptySessionsAfter: ", aztán hozz létre menetet.",
    teamSingular: "csapat",
    teamPlural: "csapat",
    sessionEnded: "lezárva",
    sessionLive: "élő",
  },

  align: {
    title: "Térkép igazítása",
    description:
      "Koppints a térképképre a szerkesztéshez. Húzd a sarkokat a torzításhoz, középről mozgatáshoz, a forgatás-fogantyúval forgathatod. A csúszkával az átlátszóságot állíthatod.",
    nw: "ÉNy",
    ne: "ÉK",
    sw: "DNy",
    opacity: "Átlátszóság",
    reset: "Vissza az eredetihez",
    save: "Igazítás mentése",
    saving: "Mentés…",
    needGeoref:
      "Először végezd el a 4-pontos georeferálást, hogy legyen kiindulási pozíció.",
    openAlign: "Igazítás finomhangolása",
  },

  maps: {
    title: "Térképek",
    description:
      "Tölts fel egy PDF-et vagy képet egy körzeti útvonaltérképről. Ezután kattints 4 ismert pontra a georeferáláshoz — egyszer kell elvégezni körzetenként.",
    uploadHeader: "Új térkép feltöltése",
    label: "Megnevezés",
    labelPlaceholder: "pl. „XIX. kerület — 1. nap”",
    upload: "Feltöltés",
    rasterising: "Feldolgozás…",
    uploading: "Feltöltés…",
    saving: "Mentés…",
    pdfHelp:
      "A PDF-et a böngésződ alakítja át PNG-vé (csak az első oldal). A „maps” Storage-mappának nyilvánosnak kell lennie.",
    yours: "A te térképeid",
    none: "Még nincs térkép.",
    needsGeoref: "georeferálás szükséges",
    georeferenced: "georeferálva",
    georefAction: "Georeferálás",
    regeorefAction: "Georeferálás újra",
  },

  georef: {
    title: "Georeferálás",
    description:
      "Georeferáld a térképet: kattints 4+ ismert pontra (kereszteződésekre), majd írd be a koordinátáikat (Google Maps → jobb klikk a ponton → másold a számokat).",
    pointsHeader: "Pontok",
    noPoints: "Még nincs pont — kattints a térképre.",
    point: "Pont",
    remove: "törlés",
    latPlaceholder: "szélesség (lat)",
    lngPlaceholder: "hosszúság (lng)",
    validPoints: "Használható pont",
    fitError: "Átlagos hiba",
    fitTarget: "(cél: < 20 m)",
    save: "Georeferencia mentése",
    savingShort: "Mentés…",
  },

  newSession: {
    title: "Új menet",
    needMap: "Először egy georeferált térképre van szükség. Ugorj a",
    mapsLink: "Térképek",
    mapLabel: "Térkép",
    titleLabel: "Cím (nem kötelező)",
    titlePlaceholder: "pl. XIX. kerület — 2026-04-27",
    teams: "Csapatok",
    addTeam: "+ csapat hozzáadása",
    create: "Menet létrehozása",
    creating: "Létrehozás…",
    teamPlaceholder: (n: number) => `${n}. csapat`,
  },

  session: {
    positions: "pozíció",
    bagsLabel: "zsák",
    copy: "másol",
    copied: "másolva",
    qrShow: "QR-kód mutatása",
    end: "Menet lezárása",
    ending: "Lezárás…",
    reopen: "Menet újranyitása",
    reopening: "Újranyitás…",
    confirmEnd: "Biztosan lezárod ezt a menetet? A csapatok linkje továbbra is működik, de a menet „lezárva” állapotba kerül.",
    endedAt: "Lezárva",
    downloadPdf: "Letöltés PDF-ben (zsákjelölésekkel)",
    generatingPdf: "PDF készítése…",
    downloadFilename: "menet",
  },

  field: {
    badge: "Terepi követő",
    intro:
      "Ez az oldal követi a pozíciódat, és gombnyomásra megjelöli a kihelyezett zsákok helyét. Helymeghatározás és iránytű engedély szükséges.",
    asking: "Kérelem küldése…",
    start: "Követés indítása",
    follow: "követés",
    bagOne: "zsák",
    bagMany: "zsák",
    drop: "Itt hagytam egy zsákot",
    bagSaveFailed: "Zsák mentése sikertelen",
    noGps: "Ezen az eszközön nincs GPS.",
  },

  errors: {
    notSignedIn: "Nem vagy bejelentkezve.",
  },
} as const;
