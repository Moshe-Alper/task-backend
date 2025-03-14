import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const taskService = {
	remove,
	query,
	getById,
	add,
	update,
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
        if(!isAdmin) criteria['owner._id'] = ownerId
        
		const collection = await dbService.getCollection('task')
		const res = await collection.deleteOne(criteria)

        if(res.deletedCount === 0) throw('Not your task')
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
    const taskToSave = { vendor: task.vendor, speed: task.speed }

    try {
        const criteria = { _id: ObjectId.createFromHexString(task._id) }

		const collection = await dbService.getCollection('task')
		await collection.updateOne(criteria, { $set: taskToSave })

		return task
	} catch (err) {
		logger.error(`cannot update task ${task._id}`, err)
		throw err
	}
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
		await collection.updateOne(criteria, { $pull: { msgs: { id: msgId }}})
        
		return msgId
	} catch (err) {
		logger.error(`cannot add task msg ${taskId}`, err)
		throw err
	}
}

function _buildCriteria(filterBy) {
    const criteria = {
        vendor: { $regex: filterBy.txt, $options: 'i' },
        speed: { $gte: filterBy.minSpeed },
    }

    return criteria
}

function _buildSort(filterBy) {
    if(!filterBy.sortField) return {}
    return { [filterBy.sortField]: filterBy.sortDir }
}