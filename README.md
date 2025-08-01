# Files Manager - Holberton School

Welcome to the **Files Manager** project repository! This repository is a capstone project for the **Holberton School Full-Stack** curriculum, focusing on the integration of several key back-end technologies to build a complete web service.

This project guides you through building a simple file hosting service from the ground up, combining authentication, database management, file storage, and background processing.

---

## Table of Contents

- [Description](#description)
- [Project Structure](#description)
- [Learning Objectives](#learning-objectives)

---

## Description

This repository contains a comprehensive back-end project designed to build a simple file hosting service from scratch. The application allows users to register, log in, and manage their files through a RESTful API.

Key features include:

- **User Authentication**: A complete authentication system using Basic Auth and token-based sessions stored in Redis.
- **File Management**: Functionality to upload new files (including folders and images), view file details, list files with pagination, and manage file permissions (public/private).
- **Data Persistence**: Storing user and file metadata in a MongoDB database.
- **Background Processing**: Using a Bull message queue to handle asynchronous tasks like generating image thumbnails and sending welcome emails, ensuring the API remains responsive.

The project is broken down into sequential tasks that build upon each other, culminating in a functional and robust back-end product.

---

## Project Structure

Here’s an overview of the application's internal architecture:

|**File / Directory**|**Description**|
|---|---|
|`server.js`|The main entry point of the application, responsible for starting the Express server.|
|`routes/`|Defines all the API endpoints and maps them to the appropriate controller functions.|
|`controllers/`|Contains the business logic for each route, handling request processing, data validation, and interactions with the database and other services.|
|`utils/`|A collection of utility clients that handle connections and operations with external services, specifically **Redis** (`redis.mjs`) and **MongoDB** (`db.mjs`).|
|`worker.js`|A separate process that manages and executes asynchronous background jobs from a Bull message queue, such as thumbnail generation.|

---

## Learning Objectives

By the end of this project, the following concepts should be clearly understood and mastered:

### API Development with Express

- How to create a RESTful API with Express on NodeJS.
- How to structure an application with routes, controllers, and utilities.
- Handling different HTTP request methods (`GET`, `POST`, `PUT`).

### Authentication and Security

- How to authenticate a user via Basic Authentication and custom token-based logic.
- The role of the `Authorization` and custom `X-Token` HTTP headers.
- How to hash passwords using SHA1 for secure storage.
- Implementing a session mechanism by storing tokens in Redis with an expiration.

### Database and Caching

- How to connect to and interact with a MongoDB database using the official driver.
- Performing CRUD (Create, Read, Update, Delete) operations on collections.
- Implementing pagination using MongoDB's aggregation pipeline.
- How to use Redis for caching and storing temporary data like session tokens.

### Background Processing

- The importance of background workers for long-running tasks.
- How to set up and use a Bull message queue to manage jobs.
- Creating a separate worker process to handle tasks like thumbnail generation without blocking the main API thread.

---
