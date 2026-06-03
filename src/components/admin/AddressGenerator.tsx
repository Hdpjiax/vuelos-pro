"use client";

import { useState } from "react";
import { MapPin, RefreshCw, Copy, CheckCheck, User, Phone, Mail, Home } from "lucide-react";

// ─── Datos MX ────────────────────────────────────────────────────────────────
const MX_DATA = {
  regions: [
    {
      name: "Ciudad de México",
      state: "CDMX",
      zip: ["06600", "06700", "06800", "07300", "08500", "09000", "03100", "04100"],
      streets: [
        "Av. Insurgentes Sur", "Av. Reforma", "Calz. de Tlalpan", "Av. Universidad",
        "Calle Mesones", "Av. Juárez", "Calle Madero", "Av. Hidalgo",
        "Calle República de Cuba", "Av. 20 de Noviembre",
      ],
      colonies: [
        "Roma Norte", "Condesa", "Polanco", "Del Valle", "Narvarte",
        "Coyoacán", "Pedregal", "Tlalpan", "Iztapalapa", "Xochimilco",
      ],
      lada: "55",
    },
    {
      name: "Guadalajara",
      state: "Jalisco",
      zip: ["44100", "44200", "44600", "44700", "45040", "44900", "45010"],
      streets: [
        "Av. Vallarta", "Av. López Mateos", "Calle Morelos", "Av. Juárez",
        "Calle Independencia", "Av. Patria", "Calle Hidalgo", "Av. 16 de Septiembre",
      ],
      colonies: [
        "Chapultepec", "Americana", "Lafayette", "Providencia",
        "Jardines del Bosque", "Arcos Vallarta", "Santa Tere", "Mezquitán",
      ],
      lada: "33",
    },
    {
      name: "Monterrey",
      state: "Nuevo León",
      zip: ["64000", "64010", "64100", "64600", "64700", "64720", "66220"],
      streets: [
        "Av. Constitución", "Av. Morones Prieto", "Calle Hidalgo", "Av. Garza Sada",
        "Calz. Del Valle", "Av. Revolución", "Calle Padre Mier", "Av. Ruiz Cortines",
      ],
      colonies: [
        "Centro", "Obispado", "Del Valle", "Cumbres",
        "San Nicolás", "Contry", "Mitras Norte", "Azteca",
      ],
      lada: "81",
    },
    {
      name: "Morelia",
      state: "Michoacán",
      zip: ["58000", "58020", "58100", "58120", "58200", "58250", "58280"],
      streets: [
        "Av. Madero", "Calle Guillermo Prieto", "Calz. Ventura Puente",
        "Av. Camelinas", "Calle Abasolo", "Av. Acueducto", "Calle Juárez",
        "Blvd. García de León",
      ],
      colonies: [
        "Centro Histórico", "Las Américas", "Vista Bella", "Chapultepec",
        "Félix Ireta", "Jardines de Guadalupe", "Lomas de Hidalgo", "Ventura Puente",
      ],
      lada: "443",
    },
    {
      name: "Cancún",
      state: "Quintana Roo",
      zip: ["77500", "77506", "77510", "77520", "77533", "77560"],
      streets: [
        "Blvd. Kukulcán", "Av. Tulum", "Av. Cobá", "Av. Yaxchilán",
        "Calle Margaritas", "Av. Bonampak", "Calle Gladiolas",
      ],
      colonies: [
        "Zona Hotelera", "SM 22", "SM 44", "Supermanzana 3",
        "Las Palmas", "Ejidal", "Puerto Juárez",
      ],
      lada: "998",
    },
  ],
  firstNames: [
    "Carlos", "José", "Luis", "Juan", "Miguel", "Alejandro", "Roberto",
    "Diego", "Fernando", "Eduardo", "María", "Ana", "Laura", "Patricia",
    "Sofía", "Gabriela", "Daniela", "Valentina", "Alejandra", "Fernanda",
    "Andrés", "Ricardo", "Jorge", "Manuel", "Francisco", "Arturo",
    "Claudia", "Mónica", "Verónica", "Sandra",
  ],
  lastNames: [
    "García", "Hernández", "Martínez", "López", "González", "Rodríguez",
    "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera",
    "Gómez", "Díaz", "Cruz", "Morales", "Reyes", "Jiménez", "Vargas",
    "Castillo", "Mendoza", "Ruiz", "Herrera", "Medina", "Aguilar",
  ],
};

// ─── Datos USA ────────────────────────────────────────────────────────────────
const USA_DATA = {
  regions: [
    {
      name: "New York",
      state: "NY",
      zip: ["10001", "10002", "10003", "10010", "10019", "10022", "11201"],
      streets: [
        "Broadway", "5th Avenue", "Madison Avenue", "Lexington Avenue",
        "Park Avenue", "7th Avenue", "Amsterdam Avenue", "Columbus Avenue",
      ],
      city: "New York",
    },
    {
      name: "Los Angeles",
      state: "CA",
      zip: ["90001", "90012", "90024", "90036", "90045", "90210", "90401"],
      streets: [
        "Sunset Blvd", "Hollywood Blvd", "Wilshire Blvd", "Santa Monica Blvd",
        "Melrose Ave", "Venice Blvd", "Sepulveda Blvd", "Century Blvd",
      ],
      city: "Los Angeles",
    },
    {
      name: "Miami",
      state: "FL",
      zip: ["33101", "33125", "33130", "33132", "33139", "33154", "33160"],
      streets: [
        "Biscayne Blvd", "Collins Ave", "Ocean Drive", "SW 8th Street",
        "Flagler Street", "NW 7th Ave", "Coral Way", "Bird Road",
      ],
      city: "Miami",
    },
    {
      name: "Chicago",
      state: "IL",
      zip: ["60601", "60605", "60610", "60614", "60622", "60637", "60657"],
      streets: [
        "Michigan Avenue", "Lake Shore Drive", "State Street", "Wacker Drive",
        "Clark Street", "Halsted Street", "Western Avenue", "Division Street",
      ],
      city: "Chicago",
    },
    {
      name: "Houston",
      state: "TX",
      zip: ["77001", "77002", "77006", "77019", "77027", "77056", "77098"],
      streets: [
        "Main Street", "Westheimer Rd", "Kirby Drive", "Richmond Ave",
        "Shepherd Drive", "Montrose Blvd", "Heights Blvd", "Fannin Street",
      ],
      city: "Houston",
    },
    {
      name: "Phoenix",
      state: "AZ",
      zip: ["85001", "85004", "85012", "85016", "85021", "85032", "85048"],
      streets: [
        "Camelback Rd", "Indian School Rd", "McDowell Rd", "Thomas Rd",
        "Central Ave", "16th Street", "Scottsdale Rd", "Shea Blvd",
      ],
      city: "Phoenix",
    },
  ],
  firstNames: [
    "James", "John", "Robert", "Michael", "William", "David", "Richard",
    "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda",
    "Barbara", "Elizabeth", "Susan", "Jessica", "Sarah", "Karen",
    "Christopher", "Daniel", "Matthew", "Anthony", "Donald", "Mark",
    "Ashley", "Emily", "Donna", "Michelle",
  ],
  lastNames: [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson",
    "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
    "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez",
  ],
};

const EMAIL_DOMAINS_SHORT = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "protonmail.com", "live.com", "aol.com",
];

type CountryKey = "MX" | "USA";

interface GeneratedEntry {
  id: number;
  fullName: string;
  phone: string;
  address: string;
  email: string;
  region: string;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randNum(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildEmail(firstName: string, lastName: string): string {
  const f = firstName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const l = lastName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const patterns = [
    `${f}.${l}`,
    `${f}${l}`,
    `${f}${l}${randNum(1, 99)}`,
    `${f[0]}${l}`,
    `${f}.${l}${randNum(1, 9)}`,
  ];
  return `${rand(patterns)}@${rand(EMAIL_DOMAINS_SHORT)}`;
}

function generateMX(regionName: string, count: number): GeneratedEntry[] {
  const region = MX_DATA.regions.find((r) => r.name === regionName) ?? MX_DATA.regions[0];
  const results: GeneratedEntry[] = [];
  for (let i = 0; i < count; i++) {
    const first = rand(MX_DATA.firstNames);
    const last1 = rand(MX_DATA.lastNames);
    const last2 = rand(MX_DATA.lastNames);
    const fullName = `${first} ${last1} ${last2}`;
    const streetNum = randNum(1, 999);
    const int = randNum(1, 30);
    const address = `${rand(region.streets)} #${streetNum} Int. ${int}, Col. ${rand(region.colonies)}, ${region.name}, ${region.state}, C.P. ${rand(region.zip)}, México`;
    const phone = `+52 (${region.lada}) ${randNum(100, 999)}-${randNum(1000, 9999)}`;
    const email = buildEmail(first, last1);
    results.push({ id: i, fullName, phone, address, email, region: region.name });
  }
  return results;
}

function generateUSA(regionName: string, count: number): GeneratedEntry[] {
  const region = USA_DATA.regions.find((r) => r.name === regionName) ?? USA_DATA.regions[0];
  const results: GeneratedEntry[] = [];
  for (let i = 0; i < count; i++) {
    const first = rand(USA_DATA.firstNames);
    const last = rand(USA_DATA.lastNames);
    const fullName = `${first} ${last}`;
    const streetNum = randNum(100, 9999);
    const apt = randNum(1, 200);
    const address = `${streetNum} ${rand(region.streets)}, Apt ${apt}, ${region.city}, ${region.state} ${rand(region.zip)}, USA`;
    const phone = `+1 (${randNum(200, 999)}) ${randNum(200, 999)}-${randNum(1000, 9999)}`;
    const email = buildEmail(first, last);
    results.push({ id: i, fullName, phone, address, email, region: region.name });
  }
  return results;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={handleCopy}
      title="Copiar"
      className="ml-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-600 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-300"
    >
      {copied
        ? <CheckCheck size={13} className="text-green-600" />
        : <Copy size={13} />}
    </button>
  );
}

function EntryCard({ entry }: { entry: GeneratedEntry }) {
  const rows = [
    { icon: <User size={13} />,  label: "Nombre",    value: entry.fullName },
    { icon: <Phone size={13} />, label: "Teléfono",  value: entry.phone },
    { icon: <Home size={13} />,  label: "Dirección", value: entry.address },
    { icon: <Mail size={13} />,  label: "Correo",    value: entry.email },
  ];

  return (
    <div
      className="rounded-3xl border-2 border-slate-200 p-4 shadow-md dark:border-white/10 dark:bg-slate-800"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Region badge */}
      <div className="mb-3 flex items-center gap-1.5">
        <MapPin size={12} className="text-sky-500" />
        <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: "#64748b" }}>
          {entry.region}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map(({ icon, label, value }) => (
          <div
            key={label}
            className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/5 dark:bg-slate-700"
            style={{ backgroundColor: "#f1f5f9" }}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                  {label}
                </p>
                <p
                  className="break-words text-[12px] font-semibold leading-snug dark:text-slate-200"
                  style={{ color: "#1e293b" }}
                >
                  {value}
                </p>
              </div>
            </div>
            <CopyButton value={value} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AddressGenerator() {
  const [country, setCountry] = useState<CountryKey>("MX");
  const [region, setRegion] = useState("Ciudad de México");
  const [count, setCount] = useState(4);
  const [entries, setEntries] = useState<GeneratedEntry[]>([]);
  const [generated, setGenerated] = useState(false);

  const regionList = country === "MX"
    ? MX_DATA.regions.map((r) => r.name)
    : USA_DATA.regions.map((r) => r.name);

  function handleCountryChange(c: CountryKey) {
    setCountry(c);
    setRegion(c === "MX" ? MX_DATA.regions[0].name : USA_DATA.regions[0].name);
    setEntries([]);
    setGenerated(false);
  }

  function handleGenerate() {
    const result = country === "MX"
      ? generateMX(region, count)
      : generateUSA(region, count);
    setEntries(result);
    setGenerated(true);
  }

  function handleRegenerate() {
    const result = country === "MX"
      ? generateMX(region, count)
      : generateUSA(region, count);
    setEntries(result);
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg">
          <MapPin size={22} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Address Generator</h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Genera identidades ficticias con dirección, teléfono y correo reales de MX o USA
          </p>
        </div>
      </div>

      {/* Controls */}
      <div
        className="rounded-3xl border-2 border-slate-300 p-5 shadow-md dark:border-white/10 dark:bg-slate-800"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="flex flex-wrap items-end gap-4">

          {/* País */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#475569" }}>País</label>
            <div className="flex gap-2">
              {(["MX", "USA"] as CountryKey[]).map((c) => (
                <button
                  key={c}
                  onClick={() => handleCountryChange(c)}
                  className={`rounded-2xl border-2 px-5 py-2.5 text-sm font-black transition-all ${
                    country === c
                      ? "border-transparent bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg"
                      : "border-slate-300 bg-slate-100 text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  }`}
                >
                  {c === "MX" ? "🇲🇽 México" : "🇺🇸 USA"}
                </button>
              ))}
            </div>
          </div>

          {/* Región */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#475569" }}>Región / Ciudad</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-slate-700 dark:text-white"
              style={{ backgroundColor: "#f1f5f9", color: "#0f172a", borderColor: "#94a3b8" }}
            >
              {regionList.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Cantidad */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#475569" }}>Cantidad</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-slate-700 dark:text-white"
              style={{ backgroundColor: "#f1f5f9", color: "#0f172a", borderColor: "#94a3b8" }}
            >
              {[2, 4, 6, 8, 10].map((n) => (
                <option key={n} value={n}>{n} identidades</option>
              ))}
            </select>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <MapPin size={15} />
              Generar
            </button>
            {generated && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                <RefreshCw size={14} />
                Regenerar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resultados */}
      {entries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!generated && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 py-16 text-center dark:border-white/10 dark:bg-slate-800/50"
          style={{ backgroundColor: "#f8fafc" }}
        >
          <MapPin size={36} className="text-slate-400" />
          <p className="text-sm font-bold" style={{ color: "#475569" }}>
            Selecciona un país y región, luego presiona{" "}
            <span className="text-emerald-600">Generar</span>
          </p>
          <p className="text-xs font-semibold" style={{ color: "#64748b" }}>
            Genera nombre, teléfono, dirección y correo ficticios · copiables por campo
          </p>
        </div>
      )}
    </div>
  );
}
