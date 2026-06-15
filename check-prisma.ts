import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Checking ServiceCategory dmmf...");
    // @ts-ignore
    const dmmf = prisma._baseDmmf;
    const model = dmmf.datamodel.models.find((m: any) => m.name === "ServiceCategory");
    console.log("Model:", JSON.stringify(model, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
