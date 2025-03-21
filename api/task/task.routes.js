import express from 'express'

import { log } from '../../middlewares/logger.middleware.js'

import { getTasks, getTaskById, addTask, updateTask, removeTask, clearAllTasks, startTask, toggleWorker, getWorkerStatus } from './task.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:

router.get('/', log, getTasks)
router.get('/:id', log, getTaskById)
router.post('/', log, addTask)
router.put('/:id', updateTask)
router.delete('/:id', removeTask)
router.delete('/clear', clearAllTasks)

router.post('/:id/start', startTask)

router.post('/worker/toggle', toggleWorker)
router.get('/worker/status', getWorkerStatus)

export const taskRoutes = router