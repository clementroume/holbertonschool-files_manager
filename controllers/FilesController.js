import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import getAuthenticatedUserId from '../utils/auth';

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
    const userId = await getAuthenticatedUserId(req, res);

    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
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

      if (parentId !== 0) {
        const parentFile = await filesCollection.findOne({
          _id: new ObjectId(parentId),
        });
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
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
        return res.status(201).json({
          id: result.insertedId,
          ...newFileDocument,
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
   * @param {object} req The Express request object.
   * @param {object} res The Express response object.
   */
  static async getShow(req, res) {
    const userId = await getAuthenticatedUserId(req, res);

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const file = await db.collection('files').findOne({
        _id: new ObjectId(req.params.id),
        userId: new ObjectId(userId),
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file);
    } catch (error) {
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
    const userId = await getAuthenticatedUserId(req, res);

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const filesCollection = db.collection('files');

      const pipeline = [
        {
          $match: {
            userId: new ObjectId(userId),
            parentId: parentId === '0' ? 0 : new ObjectId(parentId),
          },
        },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ];

      const files = await filesCollection.aggregate(pipeline).toArray();

      return res.status(200).json(files);
    } catch (error) {
      console.error('Error in getIndex:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default FilesController;
