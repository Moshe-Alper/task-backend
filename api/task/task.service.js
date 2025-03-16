import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'
import { externalService } from '../../services/external.service.js'

const PAGE_SIZE = 3
let isWorkerOn = false

export const taskService = {
	remove,
	query,
	getById,
	add,
	update,

	performTask,
	getNextTask,

	toggleWorker,
	getWorkerStatus,

	addTaskMsg,
	removeTaskMsg,
}

async function query(filterBy = { txt: '' }) {
	try {
		const criteria = _buildCriteria(filterBy)
		const sort = _buildSort(filterBy)

		const collection = await dbService.getCollection('task')
		var taskCursor = await collection.find(criteria, { sort })

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
	const { loggedinUser } = asyncLocalStorage.getStore()
	const { _id: ownerId, isAdmin } = loggedinUser

	try {
		const criteria = {
			_id: ObjectId.createFromHexString(taskId),
		}
		if (!isAdmin) criteria['owner._id'] = ownerId

		const collection = await dbService.getCollection('task')
		const res = await collection.deleteOne(criteria)

		if (res.deletedCount === 0) throw ('Not your task')
		return taskId
	} catch (err) {
		logger.error(`cannot remove task ${taskId}`, err)
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

		const task = await collection.findOneAndUpdate(
			{ status: { $in: ['new', 'fail'] } }, // Get tasks that need execution
			{ $set: { status: 'running', lastTriedAt: Date.now() }, $inc: { triesCount: 1 } }, // Mark as running
			{ returnDocument: 'after', sort: { importance: -1, createdAt: 1 } } // Prioritize highest importance, then oldest first
		)

		return task.value
	} catch (err) {
		logger.error('Failed to get next task', err)
		throw err
	}
}

async function runWorker() {
	if (!isWorkerOn) return
	var delay = 5000
	try {
		const task = await getNextTask()
		if (task) {
			try {
				await performTask(task)
			} catch (err) {
				console.log(`Failed Task`, err)
			} finally {
				delay = 1
			}
		} else {
			console.log('Snoozing... no tasks to perform')
		}
	} catch (err) {
		console.log(`Failed getting next task to execute`, err)
	} finally {
		setTimeout(runWorker, delay)
	}
}

function toggleWorker() {
	isWorkerOn = !isWorkerOn
	if (isWorkerOn) runWorker()
	return isWorkerOn
}

function getWorkerStatus() {
	return isWorkerOn
}

async function addTaskMsg(taskId, msg) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(taskId) }
		msg.id = makeId()

		const collection = await dbService.getCollection('task')
		await collection.updateOne(criteria, { $push: { msgs: msg } })

		return msg
	} catch (err) {
		logger.error(`cannot add task msg ${taskId}`, err)
		throw err
	}
}

async function removeTaskMsg(taskId, msgId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(taskId) }

		const collection = await dbService.getCollection('task')
		await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

		return msgId
	} catch (err) {
		logger.error(`cannot add task msg ${taskId}`, err)
		throw err
	}
}

function _buildCriteria(filterBy) {
	const criteria = {}

	if (filterBy.txt !== undefined) {
		criteria.title = { $regex: filterBy.txt, $options: 'i' }
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