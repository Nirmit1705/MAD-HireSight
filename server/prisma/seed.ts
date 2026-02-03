import { PrismaClient, AptitudeCategory, DifficultyLevel } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface QuestionData {
  questionText: string;
  options: string[];
  correctOption: number;
  category: string;
  difficulty: string;
  explanation: string;
  tags: string[];
}

// Function to load questions from JSON file using fs module
function loadQuestionsFromJSON(): QuestionData[] {
  try {
    // Use fs.readFileSync to load JSON file
    const jsonPath = join(__dirname, '..', 'data', 'aptitude-questions.json');
    const jsonData = readFileSync(jsonPath, 'utf8');
    const questionsData = JSON.parse(jsonData);
    return questionsData.questions;
  } catch (error) {
    console.error('Error loading questions from JSON:', error);
    throw new Error('Failed to load questions from aptitude-questions.json');
  }
}

async function main() {
  console.log('Starting aptitude questions seed...');

  try {
    // Load questions from JSON file
    const questionsFromJSON = loadQuestionsFromJSON();
    console.log(`Loaded ${questionsFromJSON.length} questions from JSON file`);

    // Clear existing questions
    await prisma.aptitudeQuestion.deleteMany();
    console.log('Cleared existing aptitude questions');

    // Insert questions from JSON file
    let count = 0;
    for (const question of questionsFromJSON) {
      await prisma.aptitudeQuestion.create({
        data: {
          questionText: question.questionText,
          options: question.options,
          correctOption: question.correctOption,
          category: question.category as AptitudeCategory,
          difficulty: question.difficulty as DifficultyLevel
        }
      });
      count++;
    }
    
    console.log(`Seeded ${count} aptitude questions from JSON file`);

    // Show breakdown by category
    const categories = await prisma.aptitudeQuestion.groupBy({
      by: ['category'],
      _count: true
    });
    
    console.log('\nQuestions by category:');
    categories.forEach(cat => {
      console.log(`   - ${cat.category}: ${cat._count} questions`);
    });

    // Show breakdown by difficulty
    const difficulties = await prisma.aptitudeQuestion.groupBy({
      by: ['difficulty'],
      _count: true
    });
    
    console.log('\nQuestions by difficulty:');
    difficulties.forEach(diff => {
      console.log(`   - ${diff.difficulty}: ${diff._count} questions`);
    });

    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });