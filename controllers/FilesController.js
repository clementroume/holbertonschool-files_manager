import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Controller for handling file-related endpoints.
 */
class FilesController {
  /**
   * Handles the upload of a new file or creation of a folder.
   * @param {object} req The Express request object.
   * @param {object} res The Express response object.
   */
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = req.body || {};

    if (!name) {
      res.status(400).json({ error: 'Missing name' });
      return;
    }
    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      res.status(400).json({ error: 'Missing type' });
      return;
    }
    if (type !== 'folder' && !data) {
      res.status(400).json({ error: 'Missing data' });
      return;
    }

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const filesCollection = db.collection('files');

      if (parentId !== 0) {
        const parentFile = await filesCollection.findOne({
          _id: new ObjectId(parentId),
        });
        if (!parentFile) {
          res.status(400).json({ error: 'Parent not found' });
          return;
        }
        if (parentFile.type !== 'folder') {
          res.status(400).json({ error: 'Parent is not a folder' });
          return;
        }
      }

      const newFileDocument = {
        userId: new ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === 0 ? 0 : new ObjectId(parentId),
      };

      if (type === 'folder') {
        const result = await filesCollection.insertOne(newFileDocument);
        res.status(201).json({
          id: result.insertedId,
          userId: newFileDocument.userId,
          name: newFileDocument.name,
          type: newFileDocument.type,
          isPublic: newFileDocument.isPublic,
          parentId: newFileDocument.parentId,
        });
        return;
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

      res.status(201).json({
        id: result.insertedId,
        userId: newFileDocument.userId,
        name: newFileDocument.name,
        type: newFileDocument.type,
        isPublic: newFileDocument.isPublic,
        parentId: newFileDocument.parentId,
      });
      return;
    } catch (error) {
      if (error.name === 'BSONTypeError') {
        res.status(400).json({ error: 'Parent not found' });
        return;
      }
      console.error('Error during file upload:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves a file document based on its ID.
   * @param {object} req The Express request object.
   * @param {object} res The Express response object.
   */
  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const file = await db.collection('files').findOne({
        _id: new ObjectId(req.params.id),
        userId: new ObjectId(userId),
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Manually format the response object to match test expectations
      const resParentId = file.parentId === '0' || file.parentId === 0 ? 0 : file.parentId.toString();

      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: resParentId,
      });
    } catch (error) {
      // Handle cases where the file ID is not a valid ObjectId
      if (error.name === 'BSONTypeError') {
        return res.status(404).json({ error: 'Not found' });
      }
      console.error('Error in getShow:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves a paginated list of file documents.
   * @param {object} req The Express request object.
   * @param {object} res The Express response object.
   */
  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = '0' } = req.query;
    let page = parseInt(req.query.page, 10) || 0;

    if (Number.isNaN(page) || page < 0) {
      page = 0;
    }

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const filesCollection = db.collection('files');

      const query = {
        userId: new ObjectId(userId),
      };

      if (parentId === '0') {
        query.parentId = 0;
      } else {
        if (!ObjectId.isValid(parentId)) {
          return res.status(200).json([]);
        }
        query.parentId = new ObjectId(parentId);
      }

      const files = await filesCollection
        .find(query)
        .skip(page * 20)
        .limit(20)
        .toArray();

      // Manually format the response to match the expected output
      const result = files.map((file) => ({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: (file.parentId === '0' || file.parentId === 0) ? 0 : file.parentId.toString(),
      }));

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in getIndex:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default FilesController;
