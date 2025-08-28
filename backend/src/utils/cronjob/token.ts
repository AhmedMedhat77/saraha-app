import { CronJob } from 'cron';
import { Token } from '../../DB/models/token.model';

/** 
 * Clean up expired and blacklisted tokens
 * Runs daily at midnight to maintain database performance
*/

export const job = new CronJob(
  '0 0 * * *', // Run at midnight every day
  async function () {
    try {
      console.log('Starting token cleanup job...');
      
      // Clean up expired tokens
      const expiredResult = await Token.cleanExpired();
      console.log(`Cleaned up ${expiredResult.deletedCount} expired tokens`);
      
      // Clean up old blacklisted tokens (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const blacklistedResult = await Token.deleteMany({
        isBlacklisted: true,
        updatedAt: { $lt: thirtyDaysAgo }
      });
      console.log(`Cleaned up ${blacklistedResult.deletedCount} old blacklisted tokens`);
      
      console.log('Token cleanup job completed successfully');
    } catch (error) {
      console.error('Error in token cleanup job:', error);
    }
  },
  null, // onComplete
  true, // start
  'Africa/Cairo', // timeZone (Cairo timezone as per your location)
);
