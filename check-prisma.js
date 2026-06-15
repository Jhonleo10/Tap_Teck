const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    try {
        const categories = await prisma.serviceCategory.findMany({
            include: {
                services: true
            }
        });
        console.log("Success!");
    } catch (err) {
        console.error(err.message);
    }
}

main().finally(() => prisma.$disconnect());
