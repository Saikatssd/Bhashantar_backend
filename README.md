# Bhasantar Backend

This repository contains the Node.js and Express.js backend API for the Bhasantar document translation and management platform.

## Table of Contents

  - [Project Overview](#project-overview)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Environment Variables](#environment-variables)
  - [Deployment](#deployment)
  - [API Endpoints](#api-endpoints)
  - [Folder Structure](#folder-structure)
  - [Contributing](#contributing)
  - [License](#license)

## Project Overview

The Bhasantar backend provides the core API services for document management, user authentication, translation status updates, and interaction with the translation engine. It serves as the bridge between the frontend, Firebase (Firestore, Auth), and Google Cloud Storage.

## Features

  - User authentication and authorization with role-based access control.
  - Secure document upload handling and storage in Google Cloud Storage.
  - Comprehensive API for managing the entire document lifecycle: upload, translation, assignment, review, approval, and delivery.
  - Integration with a machine translation service.
  - Management of companies, projects (judgements), and user roles.
  - Generation of detailed reports and data exports.
  - Functionality for batch operations like bulk user creation.

## Tech Stack

  - **Backend:** Node.js, Express.js
  - **Database:** Google Cloud Firestore
  - **Authentication:** Firebase Authentication
  - **File Storage:** Google Cloud Storage
  - **Deployment:** Google App Engine

## Prerequisites

  - Node.js (LTS version recommended)
  - npm (Node Package Manager)
  - Access to a Google Cloud project with Firebase, Cloud Storage, and App Engine enabled.
  - Service account credentials for your Google Cloud project.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-organization/bhasantar-backend.git](https://github.com/your-organization/bhasantar-backend.git)
    cd bhasantar-backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running Locally

1.  **Create a `.env` file** in the root directory. Copy the contents of `.env.example` (if available) or use the structure outlined in the Environment Variables section below.
2.  **Set up Firebase Admin SDK credentials:** Download your service account key file (`serviceAccountKey.json`) from the Google Cloud Console and place it in a secure location. Update the `.env` file with the path to this key.
3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The API will be available at `http://localhost:5000` (or the port specified in your `.env` file).

## Environment Variables

Create a `.env` file in the project's root directory and add the following variables. These are essential for connecting to Google Cloud services.

The port your local server will run on
PORT=5000

Path to your Firebase service account key file
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/serviceAccountKey.json

The name of your Google Cloud Storage bucket
GCS_BUCKET_NAME=your-gcs-bucket-name


**Note:** For production environments, it is strongly recommended to use a secret management service like Google Cloud Secret Manager instead of committing credential files.

## Deployment

This application is designed to be deployed on Google App Engine.

1.  **Install the Google Cloud SDK:** Follow the official instructions to install and initialize the `gcloud` CLI tool.
2.  **Authenticate and configure your project:**
    ```bash
    gcloud auth login
    gcloud config set project [YOUR_PROJECT_ID]
    ```
3.  **Deploy the application:**
    ```bash
    gcloud app deploy
    ```
    This command reads the `app.yaml` configuration file and deploys the service to your GCP project.

## API Endpoints

The following tables outline the available API endpoints.

**Base URL:** `/api`

### Role Management

| Endpoint           | Method   | Description             | Example Request Body (JSON)                                |
| ------------------ | -------- | ----------------------- | ---------------------------------------------------------- |
| `/role/createRole` | `POST`   | Creates a new role.     | `{ "name": "Reviewer", "isAllowedToDelete": false }`       |
| `/role/assignRole` | `POST`   | Assigns a role to a user. | `{ "userId": "<user_id>", "roleId": "<role_id>" }`      |
| `/role/deleteRole` | `DELETE` | Deletes a role.         | `{ "id": "<role_id>" }`                                    |
| `/role/updateRole` | `PUT`    | Updates an existing role. | `{ "id": "<role_id>", "name": "Senior Reviewer" }`         |
| `/role/getAllRoles`| `GET`    | Retrieves all roles.    | (No body)                                                  |

### Company Management

| Endpoint                        | Method | Description                        | Example Request Body / Params                                   |
| ------------------------------- | ------ | ---------------------------------- | --------------------------------------------------------------- |
| `/company/createCompany`        | `POST` | Creates a new company.             | `{ "name": "New Law Firm" }`                                    |
| `/company`                      | `GET`  | Retrieves company information.     | Query: `?name=Kyrotics`                                         |
| `/company/getCompanyUsers/:companyId` | `GET`  | Retrieves users for a company.     | Path: `/company/getCompanyUsers/<company_id>`                   |
| `/company/getAllUsersInCompany` | `GET`  | Retrieves all users in a company.  | Query: `?companyId=<company_id>`                                |

### Project Management

| Endpoint                        | Method   | Description                        | Example Request Body / Params                                       |
| ------------------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------- |
| `/project/createProject`        | `POST`   | Creates a new project (judgement). | `{ "name": "Case-2024-001", "companyId": "<company_id>" }`          |
| `/project/:companyId/getprojects` | `GET`    | Retrieves all projects for a company. | Path: `/project/<company_id>/getprojects`                             |
| `/project/deleteProject`        | `DELETE` | Deletes a project.                 | `{ "id": "<project_id>" }`                                          |

### Permission Management

| Endpoint                        | Method | Description                         | Example Request Body (JSON)                                                                                             |
| ------------------------------- | ------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/permission/createPermission`  | `POST` | Creates new permissions for a role. | `{ "roleId": "<role_id>", "permissions": { "documents": { "read": true, "update": true } } }`                             |
| `/permission/updatePermission`  | `PUT`  | Updates permissions for a role.     | `{ "roleId": "<role_id>", "permissions": { "documents": { "read": true, "update": true, "delete": true, "assign": true } } }` |
| `/permission/getAllPermissions` | `GET`  | Retrieves all permissions.          | (No body)                                                                                                               |

### Document Management

| Endpoint                                    | Method   | Description                               | Example Params                                                 |
| ------------------------------------------- | -------- | ----------------------------------------- | -------------------------------------------------------------- |
| `/document/:projectId/getDocuments`         | `GET`    | Retrieves documents within a project.     | Path: `/document/<project_id>/getDocuments`                    |
| `/document/:projectId/documentInfo/:docId`  | `GET`    | Retrieves info for a specific document. | Path: `/document/<project_id>/documentInfo/<document_id>`      |
| `/document/:projectId/:docId/downloadPdf` | `GET`    | Downloads the PDF of a document.        | Path: `/document/<project_id>/<document_id>/downloadPdf` |
| `/document/deleteFile`                      | `DELETE` | Deletes a file from a project.          | Body: `{ "projectId": "<project_id>", "fileName": "example.pdf" }` |

### Authentication & User Management

| Endpoint              | Method | Description                   | Example Request Body (JSON)                                                                               |
| ---------------------- | ------ | ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/auth/register`       | `POST` | Registers a new user.         | `{ "name": "John Doe", "email": "john.doe@example.com", "password": "password123", "companyId": "<company_id>", "roleId": "<role_id>" }` |
| `/auth/login`          | `POST` | Logs in a user.               | `{ "email": "john.doe@example.com", "password": "password123" }`                                          |
| `/auth/bulkCreateUsers`  | `POST` | Registers multiple users.     | `[ { "name": "User One", "email": "user1@example.com", "password": "pass1", "phoneNo": "123", "roleId": "<role_id>", "companyId": "<company_id>" }, ... ]` |

## Folder Structure

/
|-- config/
|   |-- firebase.js         // Firebase Admin SDK initialization
|-- controllers/
|   |-- authController.js
|   |-- companyController.js
|   |-- documentController.js
|   |-- permissionController.js
|   |-- projectController.js
|   -- roleController.js |-- routes/ |   |-- authRoutes.js |   |-- companyRoutes.js |   |-- documentRoutes.js |   |-- permissionRoutes.js |   |-- projectRoutes.js |   -- roleRoutes.js
|-- services/
|   -- mlService.js          // Service for interacting with the translation ML model |-- app.js                    // Main Express application file |-- package.json -- README.md


## Contributing

Contributions are welcome\! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.
