const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProjects() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
    
    console.log(`Total projects: ${projects.length}`);
    projects.forEach(project => {
      console.log(`- ${project.name} (${project.status}) - Members: ${project.members.length}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();
