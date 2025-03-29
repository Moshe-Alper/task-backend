import { MongoClient } from 'mongodb'

import { config } from '../config/index.js'
import { logger } from './logger.service.js'

export const dbService = {
	 getCollection,
	 setupIndexes,
	 checkIndexes,
	 validateTextIndex 
	}

var dbConn = null

async function getCollection(collectionName) {
	try {
		const db = await _connect()
		const collection = await db.collection(collectionName)
		return collection
	} catch (err) {
		logger.error('Failed to get Mongo collection', err)
		throw err
	}
}

async function setupIndexes() {
	try {
	  const collection = await getCollection('task')
	  
	  const indexes = await collection.indexes()
	  const textIndex = indexes.find(index => index.textIndexVersion !== undefined)
	  
	  if (textIndex) {
		console.log('Dropping existing text index:', textIndex.name)
		await collection.dropIndex(textIndex.name)
	  }
	  
	  await collection.createIndex(
		{
		  title: "text",
		  description: "text"
		},
		{
		  name: "TaskTextIndex",
		  weights: {
			title: 2,    // title is more important
			description: 1
		  }
		}
	  )
	  console.log('Text index created successfully')
	  
	  const updatedIndexes = await collection.indexes()
	  console.log('Current indexes:', JSON.stringify(updatedIndexes, null, 2))
	  
	} catch (err) {
	  console.error('Failed to setup text indexes', err)
	  throw err
	}
  }

async function checkIndexes() {
	try {
		const collection = await getCollection('task')
		const indexes = await collection.indexes()
		return indexes
	} catch (err) {
		console.error('Failed to get indexes', err)
		throw err
	}
}

async function validateTextIndex() {
	try {
	  const indexes = await checkIndexes()
	  const textIndex = indexes.find(index => index.textIndexVersion !== undefined)
	  
	  if (!textIndex) {
		console.log('Text index not found, creating now...')
		await setupIndexes()
	  } else {
		console.log('Found text index:', textIndex.name)
	  }
	  return textIndex
	} catch (err) {
	  logger.error('Failed to validate text index', err)
	  throw err
	} 
  }

async function _connect() {
	if (dbConn) return dbConn

	try {
		const client = await MongoClient.connect(config.dbURL)
		return dbConn = client.db(config.dbName)
	} catch (err) {
		logger.error('Cannot Connect to DB', err)
		throw err
	}
}