import { CronJob } from 'cron';
import { Token } from '../../DB/models/token.model';

/** 
 * 
 @Delete tokens that it's created date = 1 day ago
*/

export const job = new CronJob(
  '0 0 * * *', // Run at midnight every day
  async function () {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 1);

      const result = await Token.deleteMany({
        createdAt: { $lt: sevenDaysAgo },
      });

      console.log(`Cleaned up ${result.deletedCount} expired tokens`);
    } catch (error) {
      console.error('Error cleaning up tokens:', error);
    }
  },
  null, // onComplete
  true, // start
  'Africa/Cairo', // timeZone (Cairo timezone as per your location)
);
