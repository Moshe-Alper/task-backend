import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import { getTasks, getTaskById, addTask, updateTask, removeTask, startTask, addTaskMsg, removeTaskMsg, toggleWorker, getWorkerStatus } from './task.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getTasks)
router.get('/:id', log, getTaskById)
router.post('/', log, requireAuth, addTask)
router.put('/:id', requireAuth, updateTask)
router.delete('/:id', requireAuth, removeTask)
// router.delete('/:id', requireAuth, requireAdmin, removeTask)

router.post('/:id/start', requireAuth, startTask)

router.post('/worker/toggle', toggleWorker)
router.get('/worker/status', getWorkerStatus)

router.post('/:id/msg', requireAuth, addTaskMsg)
router.delete('/:id/msg/:msgId', requireAuth, removeTaskMsg)

export const taskRoutes = router