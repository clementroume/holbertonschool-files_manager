const express = require('express');
import router from './routes/index';

// Create the Express application
const app = express();

// Set the port from environment variable or default to 5000
const port = process.env.PORT || 5050;

// Middleware to parse JSON request bodies
// Important for POST and PUT requests
app.use(express.json());

// Load all routes from the routes/index.js file
app.use(router);

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Export the app for potential testing
export default app;
