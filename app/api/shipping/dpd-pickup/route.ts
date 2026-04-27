import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface DpdPoint {
  id: string
  name: string
  nameStreet: string
  city: string
  zip: string
}

// Static dataset for Czech DPD Pickup locations.
// Covers all major cities. Replace with live DPD API when a business account is provisioned.
const DPD_POINTS: DpdPoint[] = [
  { id: 'dpd-prg-001', name: 'DPD Pickup – Praha Václavské nám.',   nameStreet: 'Václavské náměstí 1',              city: 'Praha',              zip: '11000' },
  { id: 'dpd-prg-002', name: 'DPD Pickup – Praha Náměstí Míru',     nameStreet: 'Náměstí Míru 5',                   city: 'Praha',              zip: '12000' },
  { id: 'dpd-prg-003', name: 'DPD Pickup – Praha 3 Žižkov',         nameStreet: 'Seifertova 22',                    city: 'Praha',              zip: '13000' },
  { id: 'dpd-prg-004', name: 'DPD Pickup – Praha 4 Pankrác',        nameStreet: 'Na Pankráci 30',                   city: 'Praha',              zip: '14000' },
  { id: 'dpd-prg-005', name: 'DPD Pickup – Praha 5 Smíchov',        nameStreet: 'Nádražní 84',                      city: 'Praha',              zip: '15000' },
  { id: 'dpd-prg-006', name: 'DPD Pickup – Praha 6 Dejvice',        nameStreet: 'Jugoslávských partyzánů 12',       city: 'Praha',              zip: '16000' },
  { id: 'dpd-prg-007', name: 'DPD Pickup – Praha 7 Holešovice',     nameStreet: 'Milady Horákové 100',              city: 'Praha',              zip: '17000' },
  { id: 'dpd-prg-008', name: 'DPD Pickup – Praha 8 Kobylisy',       nameStreet: 'Střelničná 8',                     city: 'Praha',              zip: '18000' },
  { id: 'dpd-prg-009', name: 'DPD Pickup – Praha 9 Prosek',         nameStreet: 'Prosecká 851/66',                  city: 'Praha',              zip: '19000' },
  { id: 'dpd-brn-001', name: 'DPD Pickup – Brno Náměstí Svobody',  nameStreet: 'Náměstí Svobody 1',               city: 'Brno',               zip: '60200' },
  { id: 'dpd-brn-002', name: 'DPD Pickup – Brno Královo Pole',      nameStreet: 'Purkyňova 95',                     city: 'Brno',               zip: '61200' },
  { id: 'dpd-brn-003', name: 'DPD Pickup – Brno Židenice',          nameStreet: 'Kosmova 20',                       city: 'Brno',               zip: '61500' },
  { id: 'dpd-brn-004', name: 'DPD Pickup – Brno Bystrc',            nameStreet: 'Filipínského 10',                  city: 'Brno',               zip: '63500' },
  { id: 'dpd-ost-001', name: 'DPD Pickup – Ostrava Centrum',        nameStreet: 'Masarykovo náměstí 1',             city: 'Ostrava',            zip: '70200' },
  { id: 'dpd-ost-002', name: 'DPD Pickup – Ostrava Poruba',         nameStreet: 'Hlavní třída 580',                 city: 'Ostrava',            zip: '70800' },
  { id: 'dpd-plz-001', name: 'DPD Pickup – Plzeň Centrum',          nameStreet: 'náměstí Republiky 1',              city: 'Plzeň',              zip: '30100' },
  { id: 'dpd-plz-002', name: 'DPD Pickup – Plzeň Bory',             nameStreet: 'Rokycanská 80',                    city: 'Plzeň',              zip: '31200' },
  { id: 'dpd-lbc-001', name: 'DPD Pickup – Liberec Centrum',        nameStreet: 'náměstí Dr. E. Beneše 1',         city: 'Liberec',            zip: '46001' },
  { id: 'dpd-olm-001', name: 'DPD Pickup – Olomouc Centrum',        nameStreet: 'Horní náměstí 1',                  city: 'Olomouc',            zip: '77900' },
  { id: 'dpd-olm-002', name: 'DPD Pickup – Olomouc Neředín',        nameStreet: 'Neředínská 35',                    city: 'Olomouc',            zip: '77900' },
  { id: 'dpd-cb-001',  name: 'DPD Pickup – České Budějovice',       nameStreet: 'náměstí Přemysla Otakara II. 1',  city: 'České Budějovice',   zip: '37001' },
  { id: 'dpd-hk-001',  name: 'DPD Pickup – Hradec Králové',         nameStreet: 'Velké náměstí 1',                 city: 'Hradec Králové',     zip: '50001' },
  { id: 'dpd-par-001', name: 'DPD Pickup – Pardubice',              nameStreet: 'Pernštýnské náměstí 1',           city: 'Pardubice',          zip: '53002' },
  { id: 'dpd-zl-001',  name: 'DPD Pickup – Zlín Centrum',           nameStreet: 'náměstí Míru 12',                 city: 'Zlín',               zip: '76001' },
  { id: 'dpd-kv-001',  name: 'DPD Pickup – Karlovy Vary',           nameStreet: 'T. G. Masaryka 1',                city: 'Karlovy Vary',       zip: '36001' },
  { id: 'dpd-ust-001', name: 'DPD Pickup – Ústí nad Labem',         nameStreet: 'Mírové náměstí 1',                city: 'Ústí nad Labem',     zip: '40001' },
  { id: 'dpd-ml-001',  name: 'DPD Pickup – Mladá Boleslav',         nameStreet: 'Staroměstské náměstí 1',          city: 'Mladá Boleslav',     zip: '29301' },
  { id: 'dpd-kl-001',  name: 'DPD Pickup – Kladno',                 nameStreet: 'náměstí starosty Pavla 1',        city: 'Kladno',             zip: '27201' },
  { id: 'dpd-mo-001',  name: 'DPD Pickup – Most',                   nameStreet: 'Radniční 1',                       city: 'Most',               zip: '43401' },
  { id: 'dpd-tep-001', name: 'DPD Pickup – Teplice',                nameStreet: 'náměstí Svobody 1',               city: 'Teplice',            zip: '41501' },
  { id: 'dpd-op-001',  name: 'DPD Pickup – Opava Centrum',          nameStreet: 'Horní náměstí 1',                  city: 'Opava',              zip: '74601' },
  { id: 'dpd-fr-001',  name: 'DPD Pickup – Frýdek-Místek',          nameStreet: 'náměstí Svobody 1',               city: 'Frýdek-Místek',      zip: '73801' },
  { id: 'dpd-jh-001',  name: 'DPD Pickup – Jihlava',                nameStreet: 'Masarykovo náměstí 1',            city: 'Jihlava',            zip: '58601' },
  { id: 'dpd-dc-001',  name: 'DPD Pickup – Děčín',                  nameStreet: 'Mírové náměstí 1',                city: 'Děčín',              zip: '40502' },
  { id: 'dpd-cheb-001', name: 'DPD Pickup – Cheb',                  nameStreet: 'náměstí Krále Jiřího 1',          city: 'Cheb',               zip: '35002' },
  { id: 'dpd-pce-001', name: 'DPD Pickup – Přerov',                 nameStreet: 'Bartošova 7',                      city: 'Přerov',             zip: '75002' },
  { id: 'dpd-krom-001', name: 'DPD Pickup – Kroměříž',              nameStreet: 'Velké náměstí 1',                  city: 'Kroměříž',           zip: '76701' },
  { id: 'dpd-vs-001',  name: 'DPD Pickup – Vsetín',                  nameStreet: 'náměstí Svobody 1',               city: 'Vsetín',             zip: '75501' },
  { id: 'dpd-uh-001',  name: 'DPD Pickup – Uherské Hradiště',       nameStreet: 'Masarykovo náměstí 21',           city: 'Uherské Hradiště',   zip: '68601' },
]

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export async function GET(req: NextRequest) {
  const q = normalize(req.nextUrl.searchParams.get('q') ?? '')

  const results = q.length < 2
    ? DPD_POINTS.slice(0, 15)
    : DPD_POINTS.filter(p =>
        normalize(p.city).includes(q) ||
        p.zip.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        normalize(p.name).includes(q) ||
        normalize(p.nameStreet).includes(q)
      ).slice(0, 20)

  return NextResponse.json({ points: results })
}
