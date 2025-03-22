# Task Backend Service

A robust Node.js backend service for managing and processing tasks with a worker system.

## Features

- Task Management (CRUD operations)
- Task Prioritization
- Worker System for Task Processing
- Pagination Support
- Text Search Capabilities
- Error Handling and Retry Mechanism
- MongoDB Integration

## API Endpoints

### Tasks

- `GET /api/task` - Get all tasks with optional filtering and pagination
- `GET /api/task/:id` - Get a specific task by ID
- `POST /api/task` - Create a new task
- `PUT /api/task/:id` - Update an existing task
- `DELETE /api/task/:id` - Delete a task
- `DELETE /api/task/clear` - Clear all tasks

## Task Structure

```javascript
{
  _id: ObjectId,
  title: string,          // Required
  importance: number,     // Higher number = higher priority
  description: string,
  status: string,        // 'new', 'done', 'failed'
  doneAt: timestamp,     // When task was completed
  result: any,          // Task execution result
  lastTriedAt: timestamp, // Last attempt timestamp
  triesCount: number,    // Number of execution attempts
  errors: string[]      // Array of error messages
}
```

## Query Parameters

- `txt`: Text search query
- `minImportance`: Filter by minimum importance level
- `status`: Filter by task status
- `sortField`: Field to sort by
- `sortDir`: Sort direction (1 for ascending, -1 for descending)
- `pageIdx`: Page number for pagination (page size: 3)

## Worker System

The service includes a worker system that can process tasks with the following features:

- Automatic task prioritization based on importance
- Retry mechanism (max 5 attempts)
- Error tracking and logging
- Fair scheduling to prevent task starvation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the server:
```bash
npm start
```

## Development

- Built with Node.js
- MongoDB for data storage
- Express.js for the web server
- Winston for logging

## Error Handling

The service includes comprehensive error handling:
- Input validation
- Database operation error handling
- Task execution error tracking
- Logging of all errors

## License

MIT 