const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAssessments() {
  try {
    const assessments = await prisma.assessment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        chatgptAnalysis: true,
        chatgptAnalysisDate: true,
        claimType: true
      }
    });
    
    console.log('Recent Assessments:');
    assessments.forEach((a, i) => {
      console.log(`${i+1}. ID: ${a.id}`);
      console.log(`   Created: ${a.createdAt}`);
      console.log(`   Claim Type: ${a.claimType}`);
      console.log(`   Has ChatGPT Analysis: ${!!a.chatgptAnalysis}`);
      console.log(`   Analysis Date: ${a.chatgptAnalysisDate || 'None'}`);
      if (a.chatgptAnalysis) {
        console.log(`   Analysis Preview: ${a.chatgptAnalysis.substring(0, 100)}...`);
      }
      console.log('');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAssessments();
