import Bull from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

// Create queues for file and user processing
const fileQueue = new Bull('fileQueue');
const userQueue = new Bull('userQueue');

// Process jobs for generating file thumbnails
fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
  const file = await db.collection('files').findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  });

  if (!file) throw new Error('File not found');

  const widths = [500, 250, 100];
  const thumbnailPromises = widths.map(async (width) => {
    try {
      const options = { width };
      const thumbnail = await imageThumbnail(file.localPath, options);
      const thumbnailPath = `${file.localPath}_${width}`;
      fs.writeFileSync(thumbnailPath, thumbnail);
    } catch (error) {
      console.error(
        `Error generating thumbnail for file ${fileId} with width ${width}:`,
        error,
      );
    }
  });

  await Promise.all(thumbnailPromises);
});

// Process jobs for sending welcome emails
userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) throw new Error('Missing userId');

  const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
  const user = await db
    .collection('users')
    .findOne({ _id: new ObjectId(userId) });

  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);
});

export { fileQueue, userQueue };
