import { prisma } from "@/lib/prisma";

type ChapterSeed = {
  code: string;
  name: string;
};

const CHAPTERS: ChapterSeed[] = [
  { code: "AKA", name: "Alaska Chapter NECA" },
  { code: "ABY", name: "Albany Chapter NECA" },
  { code: "ALB", name: "American Line Builders Chapter NECA" },
  { code: "ARI", name: "Arizona Chapter NECA" },
  { code: "ARK", name: "Arkansas Chapter NECA" },
  { code: "ATL", name: "Atlanta Chapter NECA" },
  { code: "ACC", name: "Atlantic Coast Chapter NECA" },
  { code: "BAT", name: "Baton Rouge Chapter NECA" },
  { code: "BOS", name: "Boston Chapter NECA" },
  { code: "CCC", name: "California Central Coast Chapter NECA" },
  { code: "CAS", name: "Cascade Chapter NECA" },
  { code: "CFL", name: "Central Florida Chapter NECA" },
  { code: "CEL", name: "Central Illinois Chapter NECA" },
  { code: "NCI", name: "Central Indiana Chapter NECA" },
  { code: "CMA", name: "Central Massachusetts Chapter NECA" },
  { code: "CMS", name: "Central Mississippi Chapter NECA" },
  { code: "COH", name: "Central Ohio Chapter NECA" },
  { code: "CTX", name: "Central Texas Chapter NECA" },
  { code: "CHI", name: "Chicago & Cook County Chapter NECA" },
  { code: "CTI", name: "Cincinnati Chapter NECA" },
  { code: "CCT", name: "Connecticut Chapter NECA" },
  { code: "CON", name: "Contra Costa Chapter NECA" },
  { code: "DAK", name: "Dakotas Chapter NECA" },
  { code: "ECC", name: "East Central California Chapter NECA" },
  { code: "ETN", name: "East Tennessee Chapter NECA" },
  { code: "EIL", name: "Eastern Illinois Chapter NECA" },
  { code: "EOK", name: "Eastern Oklahoma Chapter NECA" },
  { code: "ELP", name: "El Paso Chapter NECA" },
  { code: "FIN", name: "Finger Lakes New York Chapter NECA" },
  { code: "FWC", name: "Florida West Coast Chapter NECA" },
  { code: "GEO", name: "Georgia Chapter NECA" },
  { code: "GCL", name: "Greater Cleveland Chapter NECA" },
  { code: "GSA", name: "Greater Sacramento Chapter NECA" },
  { code: "GUL", name: "Gulf Coast Chapter NECA" },
  { code: "HAW", name: "Hawaii Chapter NECA" },
  { code: "HUD", name: "Hudson Valley Chapter NECA" },
  { code: "IDA", name: "Idaho Chapter NECA" },
  { code: "ILL", name: "Illinois Chapter NECA" },
  { code: "INL", name: "Inland Empire Chapter NECA" },
  { code: "INT", name: "Intermountain Chapter NECA" },
  { code: "IOW", name: "Iowa Chapter NECA" },
  { code: "KAN", name: "Kansas Chapter NECA" },
  { code: "KAC", name: "Kansas City Chapter NECA" },
  { code: "KER", name: "Kern County Chapter NECA" },
  { code: "NSK", name: "Long Island Chapter NECA" },
  { code: "LOS", name: "Los Angeles County Chapter NECA" },
  { code: "LOU", name: "Louisville Chapter NECA" },
  { code: "POH", name: "Mahoning Valley Chapter NECA" },
  { code: "MAD", name: "Maryland Chapter NECA" },
  { code: "MEM", name: "Memphis Chapter NECA" },
  { code: "MIC", name: "Michigan Chapter NECA" },
  { code: "MIL", name: "Milwaukee Chapter NECA" },
  { code: "MIN", name: "Minneapolis Chapter NECA" },
  { code: "MVL", name: "Missouri Valley Line Constructors Chapter NECA" },
  { code: "MON", name: "Montana Chapter NECA" },
  { code: "MTY", name: "Monterey Bay California Chapter NECA" },
  { code: "NEB", name: "Nebraska Chapter NECA" },
  { code: "CNM", name: "New Mexico Chapter NECA" },
  { code: "NYC", name: "New York City Chapter NECA" },
  { code: "NCO", name: "North Central Ohio Chapter NECA" },
  { code: "NFL", name: "North Florida Chapter NECA" },
  { code: "NLA", name: "North Louisiana Chapter NECA" },
  { code: "NOT", name: "North Texas Chapter NECA" },
  { code: "OUA", name: "Northeast Louisiana Chapter NECA" },
  { code: "NEI", name: "Northeastern Illinois Chapter NECA" },
  { code: "NEL", name: "Northeastern Line Constructors Chapter NECA" },
  { code: "NOC", name: "Northern California Chapter NECA" },
  { code: "NIL", name: "Northern Illinois Chapter NECA" },
  { code: "NIN", name: "Northern Indiana Chapter NECA" },
  { code: "NJY", name: "Northern New Jersey Chapter NECA" },
  { code: "NNY", name: "Northern New York Chapter NECA" },
  { code: "NWL", name: "Northwest Line Constructors Chapter NECA" },
  { code: "TOL", name: "Ohio/Michigan Chapter NECA" },
  { code: "WOK", name: "Oklahoma Chapter NECA" },
  { code: "OCO", name: "Orange County Chapter NECA" },
  { code: "ORE", name: "Oregon-Columbia Chapter NECA" },
  { code: "ORP", name: "Oregon-Pacific-Cascade Chapter NECA" },
  { code: "PDJ", name: "Penn-Del-Jersey Chapter NECA" },
  { code: "PUG", name: "Puget Sound Chapter NECA" },
  { code: "QUA", name: "Quad Cities Chapter NECA" },
  { code: "RED", name: "Red River Valley Chapter NECA" },
  { code: "REM", name: "Redwood Empire Chapter NECA" },
  { code: "RIS", name: "Rhode Island & Southeast Massachusetts Chptr NECA" },
  { code: "RCH", name: "Rochester New York Chapter NECA" },
  { code: "RMT", name: "Rocky Mountain Chapter NECA" },
  { code: "SDC", name: "San Diego Chapter NECA" },
  { code: "SFR", name: "San Francisco Chapter NECA" },
  { code: "SMC", name: "San Mateo Chapter NECA" },
  { code: "SNC", name: "Santa Clara Valley Chapter NECA" },
  { code: "SFL", name: "South Florida Chapter NECA" },
  { code: "SLA", name: "South Louisiana Chapter NECA" },
  { code: "SOT", name: "South Texas Chapter NECA" },
  { code: "STX", name: "Southeast Texas Chapter NECA" },
  { code: "SEL", name: "Southeastern Line Constructors Chapter NECA" },
  { code: "SEM", name: "Southeastern Michigan Chapter NECA" },
  { code: "SAG", name: "Southern Arizona Chapter NECA" },
  { code: "SOC", name: "Southern Colorado Chapter NECA" },
  { code: "SIN", name: "Southern Indiana Chapter NECA" },
  { code: "SNV", name: "Southern Nevada Chapter NECA" },
  { code: "SJY", name: "Southern New Jersey Chapter NECA" },
  { code: "SSI", name: "Southern Sierras Chapter NECA" },
  { code: "STI", name: "Southern Tier Chapter NECA" },
  { code: "SLO", name: "Southwest Louisiana Chapter NECA" },
  { code: "SWW", name: "Southwest Washington Chapter NECA" },
  { code: "SWL", name: "Southwestern Line Constructors Chapter NECA" },
  { code: "STL", name: "St Louis Chapter NECA" },
  { code: "STP", name: "St Paul Chapter NECA" },
  { code: "TPA", name: "Twin Ports-Arrowhead Chapter NECA" },
  { code: "WDC", name: "Washington DC Chapter NECA" },
  { code: "WTS", name: "West Texas Chapter NECA" },
  { code: "WVO", name: "West Virginia-Ohio Valley Chapter NECA" },
  { code: "WLC", name: "Western Line Constructors Chapter NECA" },
  { code: "WMA", name: "Western Massachusetts Chapter NECA" },
  { code: "WNY", name: "Western New York State Chapter NECA" },
  { code: "W OH", name: "Western Ohio Chapter NECA" },
  { code: "WPA", name: "Western Pennsylvania Chapter NECA" },
  { code: "WIS", name: "Wisconsin Chapter NECA" },
  { code: "WYO", name: "Wyoming Chapter NECA" },
];

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeName(value: string): string {
  return value.trim();
}

function validateSeed(chapters: ChapterSeed[]) {
  const codes = new Set<string>();
  const names = new Set<string>();

  for (const chapter of chapters) {
    const code = normalizeCode(chapter.code);
    const name = normalizeName(chapter.name);

    if (!code) {
      throw new Error(`Blank code found for chapter "${name}".`);
    }

    if (!name) {
      throw new Error(`Blank name found for chapter code "${code}".`);
    }

    if (codes.has(code)) {
      throw new Error(`Duplicate chapter code in seed list: "${code}"`);
    }

    if (names.has(name)) {
      throw new Error(`Duplicate chapter name in seed list: "${name}"`);
    }

    codes.add(code);
    names.add(name);
  }
}

async function upsertChapter(chapter: ChapterSeed) {
  const code = normalizeCode(chapter.code);
  const name = normalizeName(chapter.name);

  const matches = await prisma.chapter.findMany({
    where: {
      OR: [{ code }, { name }],
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (matches.length > 1) {
    throw new Error(
      `Multiple Chapter rows match "${code} - ${name}". Clean up duplicates first.`
    );
  }

  if (matches.length === 1) {
    return prisma.chapter.update({
      where: { id: matches[0].id },
      data: {
        code,
        name,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  return prisma.chapter.create({
    data: {
      code,
      name,
      isActive: true,
      deletedAt: null,
    },
  });
}

async function main() {
  validateSeed(CHAPTERS);

  for (const chapter of CHAPTERS) {
    await upsertChapter(chapter);
  }

  console.log(`Repaired ${CHAPTERS.length} chapter records.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Chapter repair failed:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });