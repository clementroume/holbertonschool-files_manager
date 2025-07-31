import Bull from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

// Create a new Bull queue that connects to the same Redis instance
const fileQueue = new Bull('fileQueue');

// Process jobs added to the fileQueue
fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  // Validate that the job contains the necessary data
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  // Fetch the file document from the database
  const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
  const file = await db.collection('files').findOne({
    _id: new ObjectId(fileId),
    userId: new ObjectId(userId),
  });

  if (!file) {
    throw new Error('File not found');
  }

  // Generate thumbnails for specified widths
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

  // Wait for all thumbnail generation to complete
  await Promise.all(thumbnailPromises);
});

export default fileQueue;
