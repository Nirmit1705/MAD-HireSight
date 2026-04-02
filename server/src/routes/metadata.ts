import { Router, Request, Response } from 'express';
import { Position } from '@prisma/client';

const router = Router();

// Get all available positions
router.get('/positions', async (req: Request, res: Response) => {
  try {
    // Map database enum values to frontend format with metadata
    const positions = [
      {
        id: 'FRONTEND_DEVELOPER',
        title: 'Frontend Developer',
        description: 'React, Vue, Angular, HTML/CSS',
        icon: 'Code'
      },
      {
        id: 'BACKEND_DEVELOPER',
        title: 'Backend Developer',
        description: 'Node.js, Python, Java, APIs',
        icon: 'Database'
      },
      {
        id: 'FULL_STACK_DEVELOPER',
        title: 'Full Stack Developer',
        description: 'Frontend + Backend expertise',
        icon: 'Settings'
      },
      {
        id: 'DATA_ANALYST',
        title: 'Data Analyst',
        description: 'SQL, Python, Data Visualization',
        icon: 'PieChart'
      },
      {
        id: 'AI_ML',
        title: 'AI/ML Engineer',
        description: 'Machine Learning, AI, Data Science',
        icon: 'Briefcase'
      },
      {
        id: 'CLOUD',
        title: 'Cloud Engineer',
        description: 'AWS, Azure, DevOps, Infrastructure',
        icon: 'Users'
      }
    ];

    res.json({
      success: true,
      data: { positions }
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch positions'
    });
  }
});

// Get all available domains
router.get('/domains', async (req: Request, res: Response) => {
  try {
    const domains = [
      { id: 'technology', title: 'Technology' },
      { id: 'finance', title: 'Finance' },
      { id: 'healthcare', title: 'Healthcare' },
      { id: 'education', title: 'Education' },
      { id: 'marketing', title: 'Marketing' },
      { id: 'consulting', title: 'Consulting' },
    ];

    res.json({
      success: true,
      data: { domains }
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch domains'
    });
  }
});

export default router;
