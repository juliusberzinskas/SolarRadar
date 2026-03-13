# SolarRadar — Administravimo panelė

Saulės elektrinių techninės priežiūros (O&M) administravimo panelė, skirta bakalauro darbui.
Leidžia administratoriui stebėti objektus, darbus, technikus ir technikų pateiktas ataskaitas.

---

## Technologijų rinkinys

| Kategorija           | Technologija                             |
|----------------------|------------------------------------------|
| Frontend             | React 19 + Vite                          |
| UI komponentai       | Material UI (MUI) v7                     |
| Lentelės             | MUI DataGrid v8                          |
| Maršrutizavimas      | React Router DOM v7                      |
| Duomenų bazė         | Firebase Firestore (real-time)           |
| Failų saugykla       | Firebase Storage                         |
| Autentifikacija      | Firebase Auth (el. paštas + slaptažodis) |
| Datos                | dayjs + relativeTime + lt locale         |
| Internacionalizacija | i18next (LT/EN)                          |
| Platforma            | Node.js + npm, veikia naršyklėje         |

---

## Projekto struktūra

```
src/
├── App.jsx                  # Maršrutai (Routes)
├── firebase.js              # Firebase konfigūracija (auth, db, storage)
├── main.jsx                 # React įėjimo taškas + tema + i18n
├── components/
│   ├── AdminRoute.jsx       # Apsaugos komponentas (reikalauja prisijungimo)
│   ├── FilterBar.jsx        # Paieška + filtrai (naudojamas daugelyje puslapių)
│   └── PageHeader.jsx       # Puslapio antraštė su pavadinimu ir veiksmų mygtukais
├── contexts/
│   └── AuthContext.jsx      # Globali autentifikacijos būsena (user, isAdmin, loading)
├── layouts/
│   └── AdminLayout.jsx      # Šoninis meniu + turinio sritis (Outlet)
├── pages/
│   ├── Login.jsx            # Prisijungimo forma
│   ├── Dashboard.jsx        # Suvestinė + KPI kortelės + paskutiniai darbai
│   ├── Sites.jsx            # Objektų sąrašas (DataGrid)
│   ├── SiteDetail.jsx       # Objekto detalės (4 skirtukai)
│   ├── Jobs.jsx             # Darbų sąrašas (DataGrid)
│   ├── JobDetail.jsx        # Darbo detalės (2 skirtukai)
│   ├── Members.jsx          # Darbuotojų sąrašas ir valdymas
│   ├── Reports.jsx          # Technikų ataskaitų sąrašas
│   ├── ReportDetail.jsx     # Ataskaitos detalės (2 skirtukai)
│   ├── Timesheets.jsx       # Darbo laiko modulis (placeholder)
│   ├── Settings.jsx         # Nustatymai (kalba, paskyra, demo duomenys)
│   └── NotFound.jsx         # 404 puslapis
└── utils/
    └── seedFirestore.js     # Demo duomenų įkėlimas į Firestore
```

---

## Autentifikacija

### Kaip veikia

1. **Firebase Auth** tvarko prisijungimą/atsijungimą (el. paštas + slaptažodis).
2. **`AuthContext`** (`src/contexts/AuthContext.jsx`) klauso `onAuthStateChanged` — kai
   vartotojas prisijungia/atsijungia, atnaujina globalią `user` ir `isAdmin` būseną.
3. `isAdmin` nustatomas pagal Firestore `users/{uid}` dokumento lauką `role === "admin"`.
4. **`AdminRoute`** (`src/components/AdminRoute.jsx`) apgaubia visus admin puslapius —
   jei vartotojas neprisijungęs arba nėra admin, nukreipia į `/login`.

### Prisijungimo srautas

```
Naršyklė → /login → Login.jsx → signInWithEmailAndPassword(auth, email, pass)
  → Firebase grąžina user → AuthContext atnaujina būseną
  → AdminRoute praleidžia → AdminLayout rodomas
```

### Atsijungimas

`Settings.jsx` → `signOut(auth)` → `navigate("/login")`.

---

## Maršrutai (Routes)

Visi admin puslapiai yra apsaugoti `AdminRoute` ir atvaizduojami `AdminLayout` viduje.

| URL                  | Komponentas    | Aprašymas                        |
|----------------------|----------------|----------------------------------|
| `/login`             | `Login`        | Viešas — prisijungimo forma      |
| `/dashboard`         | `Dashboard`    | Suvestinė su KPI                 |
| `/sites`             | `Sites`        | Objektų sąrašas                  |
| `/sites/:siteId`     | `SiteDetail`   | Konkretus objektas (4 skirtukai) |
| `/jobs`              | `Jobs`         | Darbų sąrašas                    |
| `/jobs/:jobId`       | `JobDetail`    | Konkretus darbas (2 skirtukai)   |
| `/members`           | `Members`      | Darbuotojai                      |
| `/reports`           | `Reports`      | Technikų ataskaitos              |
| `/reports/:reportId` | `ReportDetail` | Konkreti ataskaita (2 skirtukai) |
| `/timesheets`        | `Timesheets`   | Darbo laikas (placeholder)       |
| `/settings`          | `Settings`     | Nustatymai                       |
| `*`                  | `NotFound`     | 404                              |

---

## Firebase duomenų modelis (Firestore)

### Kolekcija: `users`

Kiekvienas darbuotojas (technikai + admin).

```
users/{uid}
{
  name:        string,               // Vardas Pavardė
  email:       string,               // Firebase Auth el. paštas
  role:        "admin" | "technician",
  active:      boolean,              // ar aktyvus darbuotojas
  hiredAt:     Timestamp,            // įdarbinimo data
  skillLevel:  "junior" | "mid" | "senior",
  photoURL:    string,               // (neprivaloma) profilio nuotrauka
}
```

### Kolekcija: `sites`

Saulės elektrinių objektai.

```
sites/{siteId}
{
  name:        string,               // Objekto pavadinimas
  address:     string,               // Adresas
  region:      string,               // Regionas (pvz. "Vilniaus")
  status:      "active" | "inactive" | "maintenance",
  capacityKw:  number,               // Instaliuota galia kW
  location: {
    lat:       number,               // Platuma (Google Maps)
    lng:       number,               // Ilguma (Google Maps)
  },
  mounting: {
    panelType:     string,           // Pvz. "Monocrystalline 400W"
    panelCount:    number,
    inverterModel: string,
    mountingType:  "Stogo" | "Žemės" | "Plūduriuojantis" | "Automobilių stoginė",
    installDate:   string,           // ISO data "YYYY-MM-DD"
  },
  createdAt:   Timestamp,
}
```

### Kolekcija: `jobs`

Techninės priežiūros darbai / incidentai.

```
jobs/{jobId}
{
  title:       string,
  description: string,
  siteId:      string,               // nuoroda į sites/{siteId}
  siteName:    string,               // denormalizuotas (greičiau rodyti)
  type:        "inverter_fault" | "communication" | "string_issue"
               | "inspection" | "maintenance",
  priority:    "low" | "medium" | "high",
  status:      "open" | "in_progress" | "resolved",
  assignedTo:  string,               // users/{uid} arba "" jei nepriskirta
  createdAt:   Timestamp,
  updatedAt:   Timestamp,
}
```

### Kolekcija: `reports`

Technikų pateiktos darbo ataskaitos (rašo mobilioji app).

```
reports/{reportId}
{
  jobId:          string,            // nuoroda į jobs/{jobId}
  jobTitle:       string,            // denormalizuotas
  siteId:         string,            // nuoroda į sites/{siteId}
  siteName:       string,            // denormalizuotas
  technicianId:   string,            // Firebase Auth UID
  technicianName: string,            // denormalizuotas
  submittedAt:    Timestamp,         // kada pateikta
  status:         "completed" | "not_completed" | "requires_maintenance",
  notes:          string,            // techniko pastabos (laisvas tekstas)
  photoUrls:      string[],          // nuotraukų URL iš Firebase Storage
  adminNotes:     string,            // admin vidinės pastabos (rašo admin per šią panelę)
}
```

---

## Firebase Storage struktūra

```
Firebase Storage
├── sites/
│   └── {siteId}/
│       └── photos/
│           └── {filename}       ← objekto nuotraukos (įkelia admin)
├── jobs/
│   └── {jobId}/
│       └── attachments/
│           └── {filename}       ← darbo priedai: nuotraukos, PDF (įkelia admin)
└── reports/
    └── {reportId}/
        └── photos/
            └── {filename}       ← techniko nuotraukos (įkelia mobilioji app)
```

---

## Puslapių aprašymai

### Dashboard (`/dashboard`)

- Rodo 4 KPI korteles: atidaryti darbai, vykdomi darbai, išspręsti darbai, aktyvūs objektai.
- Rodo paskutinių N darbų sąrašą (DataGrid) su prioriteto ir statuso žetonais.
- Duomenys gaunami per `onSnapshot` iš `jobs` ir `sites` kolekcijų.

### Objektai (`/sites`)

- DataGrid su visais objektais iš Firestore `sites` kolekcijos.
- Filtravimas pagal pavadinimą (paieška) ir statusą.
- Paspaudus eilutę — pereinama į `/sites/:siteId`.
- "Pridėti objektą" mygtukas atidaro dialogą — naujas įrašas kuriamas per `addDoc`.

### Objekto detalės (`/sites/:siteId`)

Duomenys gaunami realiu laiku per `onSnapshot(doc(db, "sites", siteId))`.

| Skirtukas             | Funkcionalumas                                                                        |
|-----------------------|---------------------------------------------------------------------------------------|
| **Informacija**       | Redaguojami laukai: pavadinimas, adresas, regionas, statusas, galia, koordinatės. Saugoma per `updateDoc`. |
| **Žemėlapis**         | Google Maps `<iframe>` su `?q={lat},{lng}&z=15&output=embed`. Rodomas tik jei koordinatės užpildytos. |
| **Montavimo sistema** | Laukai: plokščių tipas, skaičius, inverterio modelis, montavimo tipas, montavimo data. Saugoma kaip `mounting` sub-objektas Firestore. |
| **Nuotraukos**        | Firebase Storage `sites/{siteId}/photos/`. Įkėlimas per `<input type="file" multiple>` + `uploadBytesResumable`. Pašalinimas per `deleteObject`. |

### Darbai (`/jobs`)

- DataGrid su visais darbais iš Firestore `jobs` kolekcijos.
- Filtravimas pagal tekstą, statusą ir prioritetą.
- Paspaudus eilutę — pereinama į `/jobs/:jobId`.
- "Pridėti darbą" mygtukas: modalas su forma (pavadinimas, aprašymas, objektas, tipas, prioritetas). Saugoma per `addDoc`.

### Darbo detalės (`/jobs/:jobId`)

Duomenys gaunami realiu laiku per `onSnapshot(doc(db, "jobs", jobId))`.

| Skirtukas       | Funkcionalumas                                                                                             |
|-----------------|------------------------------------------------------------------------------------------------------------|
| **Informacija** | Tik skaitoma informacija + redaguojamas statusas ir priskirtas technikas (Select iš aktyvių technikų Firestore). Saugoma per `updateDoc`. |
| **Priedai**     | Firebase Storage `jobs/{jobId}/attachments/`. Palaikomos nuotraukos, PDF, dokumentai. Rodoma: failo pavadinimas, dydis, parsisiuntimo nuoroda. |

### Nariai (`/members`)

- DataGrid su darbuotojais iš Firestore `users` kolekcijos.
- Stulpeliai: vardas, el. paštas, lygis (žetonas), statusas, įdarbinimo data, darbo stažas.
- "Pridėti darbuotoją" ir "Redaguoti" dialogai — CRUD per `addDoc` / `updateDoc`.

### Ataskaitos (`/reports`)

- Sąrašas ataskaitų, kurias pateikia technikai per mobilią programėlę.
- Duomenys gaunami iš Firestore `reports` kolekcijos per `onSnapshot`.
- Filtravimas pagal tekstą (technikas / darbas / objektas / pastabos), statusą, objektą.
- Statusų žetonai: žalias (Atlikta), raudonas (Neatlikta), oranžinis (Reikalinga priežiūra).
- Paspaudus eilutę — pereinama į `/reports/:reportId`.
- Jei ataskaitų nėra — rodoma tuščia būsena su paaiškinimu apie mobiliąją programėlę.

### Ataskaitos detalės (`/reports/:reportId`)

Duomenys gaunami realiu laiku per `onSnapshot(doc(db, "reports", reportId))`.

| Skirtukas       | Funkcionalumas                                                                                            |
|-----------------|-----------------------------------------------------------------------------------------------------------|
| **Informacija** | Tik skaitoma: technikas, darbas, objektas, statusas, pateikimo laikas, techniko pastabos. Redaguojamas: admin pastabų laukas (`adminNotes`) — saugoma per `updateDoc`. |
| **Nuotraukos**  | Galerija iš `report.photoUrls[]` masyvo (įkelia mobilioji app). Kiekviena nuotrauka turi "Atidaryti visą dydį" mygtuką. |

### Nustatymai (`/settings`)

- **Kalba**: keitimas tarp LT / EN per i18next; saugoma `localStorage["lang"]`.
- **Paskyra**: atsijungimo mygtukas (`signOut`).
- **Demo duomenys**: mygtukas įkelia 5 technikus, 4 objektus, 8 darbus į Firestore per `writeBatch` (`utils/seedFirestore.js`).

---

## Mobiliosios programėlės integracija (Reports modulis)

Admin panelė yra **paruošta priimti duomenis** iš technikų mobiliosios programėlės. Mobilioji app turi:

1. **Kurti dokumentą** Firestore kolekcijoje `reports/{reportId}` su šiais laukais:

   ```
   jobId, jobTitle, siteId, siteName, technicianId, technicianName,
   submittedAt (serverTimestamp), status, notes, photoUrls[]
   ```

2. **Įkelti nuotraukas** į Firebase Storage keliu `reports/{reportId}/photos/{filename}`.

3. **Įrašyti URL** (iš `getDownloadURL`) į `photoUrls` masyvą ataskaitos dokumente.

Kai šie duomenys yra Firestore, admin panelė automatiškai juos rodo per `onSnapshot` — jokių papildomų konfigūracijų nereikia.

---

## Realaus laiko duomenys

Visi puslapiai naudoja Firestore `onSnapshot` — duomenys atnaujinami automatiškai, kai kitas
vartotojas (ar mobilioji app) keičia duomenis Firestore, be puslapio perkrovimo.

---

## Internacionalizacija (i18n)

- Naudojama `i18next` biblioteka su `react-i18next`.
- Kalbos failai: `public/locales/lt/translation.json` ir `public/locales/en/translation.json`.
- `useTranslation()` naudojamas šoniniame meniu (`AdminLayout`) ir `Settings` puslapyje.
- Visi kiti puslapiai tiesiogiai naudoja lietuviškus tekstus (hardcoded LT).
- Pasirinkta kalba saugoma `localStorage["lang"]`.
