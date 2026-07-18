import { PrismaClient } from "@prisma/client";
import meta from "../data/meta.json";

const prisma = new PrismaClient();

async function main() {
  for (const a of meta.achievements) {
    await prisma.achievement.upsert({
      where: { key: a.id },
      create: {
        key: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
      },
      update: {
        name: a.name,
        description: a.description,
        icon: a.icon,
      },
    });
  }
  console.log(`Seeded ${meta.achievements.length} achievements`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
