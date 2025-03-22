import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { externalService } from '../../services/external.service.js'

const PAGE_SIZE = 3
const MAX_TRIES = 5
let isWorkerOn = false

export const taskService = {
	remove,
	query,
	getById,
	add,
	update,

	performTask,
	getNextTask,

	setWorkerState,
	isWorkerRunning,

	clearAll,
}

async function query(filterBy = { txt: '' }) {
	try {
	  const criteria = _buildCriteria(filterBy)
	  let sort = _buildSort(filterBy)
	  let options = {}
	  

	  if (filterBy.txt) {
		options.projection = { score: { $meta: "textScore" } }
		
		if (!filterBy.sortField) {
		  sort = { score: { $meta: "textScore" } }
		}
	  }
  
	  const collection = await dbService.getCollection('task')
	  var taskCursor = await collection.find(criteria, options).sort(sort)
  
	  if (filterBy.pageIdx !== undefined) {
		taskCursor.skip(filterBy.pageIdx * PAGE_SIZE).limit(PAGE_SIZE)
	  }
  
	  const tasks = taskCursor.toArray()
	  return tasks
	} catch (err) {
	  logger.error('cannot find tasks', err)
	  throw err
	}
  }
async function getById(taskId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(taskId) }

		const collection = await dbService.getCollection('task')
		const task = await collection.findOne(criteria)

		task.createdAt = task._id.getTimestamp()
		return task
	} catch (err) {
		logger.error(`while finding task ${taskId}`, err)
		throw err
	}
}

async function remove(taskId) {
	try {
		const criteria = {
			_id: ObjectId.createFromHexString(taskId),
		}

		const collection = await dbService.getCollection('task')
		const res = await collection.deleteOne(criteria)
		
		if (res.deletedCount === 0) throw ('Not your task')
			return taskId
	} catch (err) {
		logger.error(`cannot remove task ${taskId}`, err)
		throw err
	}
}

async function clearAll() {
	try {
		const collection = await dbService.getCollection('task')
		await collection.deleteMany({}) 
		return { acknowledged: true } 
	} catch (err) {
		logger.error('Failed to clear tasks', err)
		throw err
	}
}

async function add(task) {
	try {
		const collection = await dbService.getCollection('task')
		await collection.insertOne(task)

		return task
	} catch (err) {
		logger.error('cannot insert task', err)
		throw err
	}
}

async function update(task) {
	const taskToSave = {
		title: task.title,
		importance: task.importance,
		status: task.status,
		doneAt: task.doneAt,
		result: task.result,
		lastTriedAt: task.lastTriedAt,
		triesCount: task.triesCount,
		errors: task.errors || []
	}
	//remove later - frontend
	try {
		const taskId = typeof task._id === 'string'
			? ObjectId.createFromHexString(task._id)
			: task._id

		const criteria = { _id: taskId }
		// const taskToSave = { ...task }

		// delete taskToSave._id
		// delete taskToSave.owner
		// delete taskToSave.createdAt
		// return when moving to frontend

		const collection = await dbService.getCollection('task')
		await collection.updateOne(criteria, { $set: taskToSave })

		return task
	} catch (err) {
		logger.error(`cannot update task ${task._id}`, err)
		throw err
	}
}

async function performTask(task) {
	try {
		task.status = 'running'
		await update(task)

		const result = await externalService.execute(task)
		task.status = 'done'
		task.doneAt = Date.now()
		task.result = result
	} catch (error) {
		task.status = 'failed'
		task.errors.push(error.toString())
	} finally {
		task.lastTriedAt = Date.now()
		task.triesCount = (task.triesCount || 0) + 1

		await update(task)
		return task
	}
}

async function getNextTask() {
	try {
		const collection = await dbService.getCollection('task')

		const task = await collection.findOne(
			{
				status: { $in: ['new', 'failed'] }, 
				triesCount: { $lt: MAX_TRIES }  
			},
			{
				sort: {
					importance: -1, //(highest first)
					triesCount: 1,//(lowest first) to prevent starvation
					createdAt: 1 //Creation time (oldest first) for fairness
				}
			}
		)

		return task
	} catch (err) {
		logger.error('Failed to get next task', err)
		throw err
	}
}

function setWorkerState(runWorkerCallback) {
    isWorkerOn = !isWorkerOn
    if (isWorkerOn && runWorkerCallback) runWorkerCallback()
    return isWorkerOn
}

function isWorkerRunning() {
	return isWorkerOn
}


  function _buildCriteria(filterBy) {
	const criteria = {}
  
	if (filterBy.txt) {
	  criteria.$text = { $search: filterBy.txt }
	}
  
	if (filterBy.minImportance !== undefined) {
	  criteria.importance = { $gte: filterBy.minImportance }
	}
  
	return criteria
  }

function _buildSort(filterBy) {
	if (!filterBy.sortField) return {}
	return { [filterBy.sortField]: filterBy.sortDir }
}