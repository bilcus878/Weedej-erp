import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface PacketaPoint {
  id: number | string
  name: string
  nameStreet?: string
  street?: string
  city: string
  zip: string
}

// Fallback dataset — used when Packeta API is unavailable or API key not configured.
// Covers major Czech cities with Z-BOX locations.
const FALLBACK: PacketaPoint[] = [
  { id: 'z-prg-001', name: 'Z-BOX Praha 1 – Palladium',           nameStreet: 'Na Poříčí 1079/3a',         city: 'Praha',              zip: '11000' },
  { id: 'z-prg-002', name: 'Z-BOX Praha 2 – Náměstí Míru',        nameStreet: 'Mánesova 18',               city: 'Praha',              zip: '12000' },
  { id: 'z-prg-003', name: 'Z-BOX Praha 4 – OC Arkády Pankrác',   nameStreet: 'Na Pankráci 86',            city: 'Praha',              zip: '14000' },
  { id: 'z-prg-004', name: 'Z-BOX Praha 5 – Anděl',               nameStreet: 'Náměstí 14. října 4',       city: 'Praha',              zip: '15000' },
  { id: 'z-prg-005', name: 'Z-BOX Praha 6 – Veleslavín',          nameStreet: 'Veleslavínská 48',          city: 'Praha',              zip: '16200' },
  { id: 'z-brn-001', name: 'Z-BOX Brno – OC Vaňkovka',            nameStreet: 'Plotní 7',                  city: 'Brno',               zip: '60200' },
  { id: 'z-brn-002', name: 'Z-BOX Brno – Královo Pole',           nameStreet: 'Purkyňova 95a',             city: 'Brno',               zip: '61200' },
  { id: 'z-ost-001', name: 'Z-BOX Ostrava – Forum Nová Karolina', nameStreet: 'Jantarová 3344/4',          city: 'Ostrava',            zip: '70200' },
  { id: 'z-plz-001', name: 'Z-BOX Plzeň – OC Plaza',              nameStreet: 'Radčická 2',                city: 'Plzeň',              zip: '30100' },
  { id: 'z-lbc-001', name: 'Z-BOX Liberec – OC Nisa',             nameStreet: 'Dr. Milady Horákové 580/7', city: 'Liberec',            zip: '46001' },
  { id: 'z-olm-001', name: 'Z-BOX Olomouc – OC Olympia',          nameStreet: 'Polská 1',                  city: 'Olomouc',            zip: '77200' },
  { id: 'z-hk-001',  name: 'Z-BOX Hradec Králové – OC Futurum',   nameStreet: 'Brněnská 23',               city: 'Hradec Králové',     zip: '50001' },
  { id: 'z-par-001', name: 'Z-BOX Pardubice – OC Palác Pardubice', nameStreet: 'nám. Republiky 2686',      city: 'Pardubice',          zip: '53002' },
  { id: 'z-cb-001',  name: 'Z-BOX České Budějovice – IGY',        nameStreet: 'F. A. Gerstnera 2151/6',   city: 'České Budějovice',   zip: '37001' },
  { id: 'z-zl-001',  name: 'Z-BOX Zlín – OC Čepkov',             nameStreet: 'Gahurova 5265',             city: 'Zlín',               zip: '76001' },
  { id: 'z-dc-001',  name: 'Z-BOX Děčín – Řetězová',              nameStreet: 'Řetězová 1368/15',         city: 'Děčín',              zip: '40502' },
  { id: 'z-ust-001', name: 'Z-BOX Ústí nad Labem – OC Fórum',    nameStreet: 'Bílinská 3218/3',          city: 'Ústí nad Labem',     zip: '40001' },
  { id: 'z-kv-001',  name: 'Z-BOX Karlovy Vary – OC Fontána',     nameStreet: 'Chebská 103/31',           city: 'Karlovy Vary',       zip: '36001' },
  { id: 'z-ml-001',  name: 'Z-BOX Mladá Boleslav – OC Bondy',    nameStreet: 'třída Václava Klementa 1229', city: 'Mladá Boleslav',  zip: '29301' },
  { id: 'z-op-001',  name: 'Z-BOX Opava – OC Breda',             nameStreet: 'Rolnická 3057/5',          city: 'Opava',              zip: '74601' },
]

let cache: PacketaPoint[] | null = null
let cacheAt = 0
const CACHE_TTL = 6 * 60 * 60 * 1000

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

async function tryFetch(url: string): Promise<PacketaPoint[] | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('json')) return null
    const json = await res.json()
    const raw: PacketaPoint[] = Array.isArray(json) ? json : (json.data ?? json.pickupPoints ?? json.branches ?? [])
    return raw.length ? raw : null
  } catch {
    return null
  }
}

async function fetchPoints(): Promise<PacketaPoint[]> {
  const now = Date.now()
  if (cache && now - cacheAt < CACHE_TTL) return cache

  const key      = process.env.NEXT_PUBLIC_PACKETA_API_KEY ?? ''
  const password = process.env.PACKETA_API_PASSWORD ?? ''

  if (key || password) {
    const urls = [
      `https://www.zasilkovna.cz/api/v4/pickup-points?apiKey=${key}&language=cs&country=CZ`,
      `https://www.zasilkovna.cz/api/v4/pickup-points?password=${encodeURIComponent(password)}&language=cs&country=CZ`,
      `https://api.packeta.com/v6/branches?apiKey=${key}&country=CZ&language=cs`,
    ]
    for (const url of urls) {
      const result = await tryFetch(url)
      if (result) { cache = result; cacheAt = now; return result }
    }
  }

  return FALLBACK
}

export async function GET(req: NextRequest) {
  const q = normalize(req.nextUrl.searchParams.get('q') ?? '')

  const all = await fetchPoints()

  const results = q.length < 2
    ? all.slice(0, 15)
    : all
        .filter(p =>
          normalize(p.city ?? '').includes(q) ||
          (p.zip ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
          normalize(p.name ?? '').includes(q) ||
          normalize(p.nameStreet ?? p.street ?? '').includes(q)
        )
        .slice(0, 20)

  return NextResponse.json({
    points: results.map(p => ({
      id:        String(p.id),
      name:      p.name,
      nameStreet: p.nameStreet ?? p.street ?? '',
      city:      p.city,
      zip:       p.zip,
    })),
  })
}
