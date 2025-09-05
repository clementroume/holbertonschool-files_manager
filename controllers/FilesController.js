import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

// Create a Bull queue for file processing
const fileQueue = new Bull('fileQueue');

/**
 * Controller for handling file-related endpoints.
 */
class FilesController {
  /**
   * Handles the upload of a new file or creation of a folder.
   */
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name,
      type,
      parentId = '0',
      isPublic = false,
      data,
    } = req.body || {};

    if (!name) return res.status(400).json({ error: 'Missing name' });
    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const filesCollection = db.collection('files');

      if (parentId !== '0') {
        const parentFile = await filesCollection.findOne({
          _id: new ObjectId(parentId),
        });
        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const newFileDocument = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? '0' : new ObjectId(parentId),
      };

      if (type === 'folder') {
        const result = await filesCollection.insertOne(newFileDocument);
        return res.status(201).json({
          id: result.insertedId,
          userId: newFileDocument.userId,
          name: newFileDocument.name,
          type: newFileDocument.type,
          isPublic: newFileDocument.isPublic,
          parentId: newFileDocument.parentId,
        });
      }

      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const localFileName = uuidv4();
      const localPath = path.join(folderPath, localFileName);
      const fileData = Buffer.from(data, 'base64');
      fs.writeFileSync(localPath, fileData);

      newFileDocument.localPath = localPath;
      const result = await filesCollection.insertOne(newFileDocument);

      if (type === 'image') {
        await fileQueue.add({ userId, fileId: result.insertedId.toString() });
      }

      return res.status(201).json({
        id: result.insertedId,
        userId: newFileDocument.userId,
        name: newFileDocument.name,
        type: newFileDocument.type,
        isPublic: newFileDocument.isPublic,
        parentId: newFileDocument.parentId,
      });
    } catch (error) {
      if (error.name === 'BSONTypeError') {
        return res.status(400).json({ error: 'Parent not found' });
      }
      console.error('Error during file upload:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves a file document based on its ID.
   */
  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const file = await db.collection('files').findOne({
        _id: new ObjectId(req.params.id),
        userId: new ObjectId(userId),
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === '0' ? 0 : file.parentId.toString(),
      });
    } catch {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  /**
   * Retrieves a paginated list of file documents.
   */
  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentIdQuery = req.query.parentId || '0';
    let page = parseInt(req.query.page, 10);
    if (Number.isNaN(page) || page < 0) page = 0;

    let filterParentId;
    try {
      filterParentId = parentIdQuery === '0' ? '0' : new ObjectId(parentIdQuery);
    } catch {
      return res.status(400).json({ error: 'Invalid parentId' });
    }

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const files = await db.collection('files')
        .find({ userId: new ObjectId(userId), parentId: filterParentId })
        .skip(page * 20)
        .limit(20)
        .toArray();

      const result = files.map((file) => ({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === '0' ? 0 : file.parentId.toString(),
      }));

      return res.status(200).json(result);
    } catch (err) {
      console.error('Error in getIndex:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Publishes a file.
   */
  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const result = await db.collection('files').findOneAndUpdate(
        { _id: new ObjectId(req.params.id), userId: new ObjectId(userId) },
        { $set: { isPublic: true } },
        { returnDocument: 'after' },
      );
      if (!result.value) return res.status(404).json({ error: 'Not found' });

      const file = result.value;
      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === '0' ? 0 : file.parentId.toString(),
      });
    } catch {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Unpublishes a file.
   */
  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const result = await db.collection('files').findOneAndUpdate(
        { _id: new ObjectId(req.params.id), userId: new ObjectId(userId) },
        { $set: { isPublic: false } },
        { returnDocument: 'after' },
      );
      if (!result.value) return res.status(404).json({ error: 'Not found' });

      const file = result.value;
      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: file.parentId === '0' ? 0 : file.parentId.toString(),
      });
    } catch {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves the content of a file.
   */
  static async getFile(req, res) {
    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const file = await db.collection('files').findOne({
        _id: new ObjectId(req.params.id),
      });
      if (!file) return res.status(404).json({ error: 'Not found' });

      if (!file.isPublic) {
        const token = req.headers['x-token'];
        const userId = await redisClient.get(`auth_${token}`);
        if (!userId || file.userId.toString() !== userId) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      const { size } = req.query;
      let filePath = file.localPath;
      if (size && ['500', '250', '100'].includes(size)) {
        filePath = `${file.localPath}_${size}`;
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      const fileContent = fs.readFileSync(filePath);
      return res.status(200).send(fileContent);
    } catch {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
