# Kanji Review Application

## Overview

This application provides a backend server for managing kanji characters and their associated review states. It uses Fastify for the server framework and MongoDB for database operations.

## Features

- Add new kanji entries
- Update review states based on user interactions
- Retrieve words associated with kanji that are ready for review

## Technologies

- **Fastify**: Server framework
- **MongoDB**: Database for storing kanji and review data
- **TypeScript**: For type safety and modern JavaScript features

## Prerequisites

- Node.js
- MongoDB

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd <project-directory>
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

The server connects to a MongoDB instance running on `localhost:27017` and uses the database `kanji_db`. Ensure your MongoDB server is up and running before starting the application.

## Running the Application

To build and run the application, execute:

```bash
npm run build
npm start
```

The server will start on port `3000`.

## API Endpoints

### 1. Add New Kanji

- **POST** `/kanji`
- Request body:
  ```json
  {
    "character": "漢",
    "readings": ["かん", "おう"],
    "words": [{
      "value": "漢字",
      "reading": "かんじ",
      "translation": "kanji"
    }]
  }
  ```

### 2. Update Review State

- **POST** `/kanji/:id/review`
- Request body:
  ```json
  {
    "correct": true
  }
  ```

### 3. Get Words for Review

- **GET** `/kanji/:id/review`
