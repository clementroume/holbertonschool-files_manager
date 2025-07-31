import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

// Create a new router instance
const router = express.Router();

// Define the /status route
// It calls the getStatus method from the AppController
router.get('/status', AppController.getStatus);

// Define the /stats route
// It calls the getStats method from the AppController
router.get('/stats', AppController.getStats);

// Define the /users route
// It calls the postNew method from the UsersController
router.post('/users', UsersController.postNew);

// Export the router to be used in server.js
export default router;
