import { cronJob } from '../src/text';

export default async function handler(req, res) {
  try {
    await cronJob();
    res.status(200).json({ message: 'Cron job executed successfully' });
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ message: 'Cron job execution failed' });
  }
}