import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

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

// Define the /users/me route
// It calls the getMe method from the UsersController
router.get('/users/me', UsersController.getMe);

// Define the /connect route
// It calls the getConnect method from the AuthController
router.get('/connect', AuthController.getConnect);

// Define the /disconnect route
// It calls the getDisconnect method from the AuthController
router.get('/disconnect', AuthController.getDisconnect);

// Export the router to be used in server.js
export default router;
