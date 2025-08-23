import { CronJob } from 'cron';
import { User } from '../../DB/models/user.model';

export const job = new CronJob(
  '0 0 * * *', // Run at midnight every day
  async function () {
    try {
      const ThreeMonthsAgo = new Date();
      ThreeMonthsAgo.setDate(ThreeMonthsAgo.getDate() - 90);

      const result = await User.deleteMany({
        isDeleted: true,
        credentialsUpdatedAt: { $lt: ThreeMonthsAgo },
      });
      

      console.log(`Cleaned up ${result.deletedCount} deleted users`);
    } catch (error) {
      console.error('Error cleaning up users:', error);
    }
  },
  null, // onComplete
  true, // start
  'Africa/Cairo', // timeZone (Cairo timezone as per your location)
);
