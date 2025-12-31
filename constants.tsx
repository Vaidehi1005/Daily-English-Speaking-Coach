
import { Topic } from './types';

export const TOPICS: Topic[] = [
  {
    id: '1',
    title: 'Your Typical Day',
    description: 'Describe your daily routine from morning to night. Focus on present simple tense.',
    difficulty: 'Beginner'
  },
  {
    id: '2',
    title: 'A Memorable Journey',
    description: 'Tell a story about a trip you took. Use past tenses and descriptive adjectives.',
    difficulty: 'Intermediate'
  },
  {
    id: '3',
    title: 'The Future of Technology',
    description: 'Share your thoughts on AI or renewable energy. Use speculative language and complex structures.',
    difficulty: 'Advanced'
  },
  {
    id: '4',
    title: 'Free Talk',
    description: 'Talk about anything on your mind. No specific constraints.',
    difficulty: 'Intermediate'
  }
];

export const COACH_SYSTEM_INSTRUCTION = `
You are a world-class English speaking coach named LinguistAI. 
Your goal is to help ESL (English as a Second Language) learners improve their speaking skills.

Rules for this session:
1. When the session starts, briefly welcome the user and encourage them to start their 1-2 minute speech on their chosen topic.
2. While the user is speaking, stay silent. Do not interrupt.
3. If the user stops for more than 5 seconds, gently encourage them to continue.
4. When the user says they are finished or reaches the 2-minute mark, provide a comprehensive review.
5. In your review, cover:
   - A summary of what they said.
   - Specific pronunciation tips (e.g., "You struggled with the 'th' sound in 'think'").
   - Grammar corrections.
   - Fluency and rhythm advice.
6. Use a supportive, professional, and clear tone.
7. Always provide the feedback verbally and also ensure the transcription captures your feedback clearly.
`;
