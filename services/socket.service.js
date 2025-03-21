import {logger} from './logger.service.js'
import {Server} from 'socket.io'

var gIo = null

export function setupSocketAPI(http) {
    gIo = new Server(http, {
        cors: {
            origin: '*',
        }
    })
    gIo.on('connection', socket => {
        logger.info(`New connected socket [id: ${socket.id}]`)
        socket.on('disconnect', () => {
            logger.info(`Socket disconnected [id: ${socket.id}]`)
        })
        socket.on('chat-set-topic', topic => {
            if (socket.myTopic === topic) return
            if (socket.myTopic) {
                socket.leave(socket.myTopic)
                logger.info(`Socket is leaving topic ${socket.myTopic} [id: ${socket.id}]`)
            }
            socket.join(topic)
            socket.myTopic = topic
        })
        socket.on('chat-send-msg', msg => {
            logger.info(`New chat msg from socket [id: ${socket.id}], emitting to topic ${socket.myTopic}`)
            // emits only to sockets in the same room
            gIo.to(socket.myTopic).emit('chat-add-msg', msg)
        })
        socket.on('client-watch', clientId => {
            logger.info(`client-watch from socket [id: ${socket.id}], on client ${clientId}`)
            socket.join('watching:' + clientId)
        })
        socket.on('set-client-id', clientId => {
            logger.info(`Setting socket.clientId = ${clientId} for socket [id: ${socket.id}]`)
            socket.clientId = clientId
        })
        socket.on('unset-client-id', () => {
            logger.info(`Removing socket.clientId for socket [id: ${socket.id}]`)
            delete socket.clientId
        })
    })
}

function emitTo({ type, data, label }) {
    if (label) gIo.to('watching:' + label.toString()).emit(type, data)
    else gIo.emit(type, data)
}

async function emitToClient({ type, data, clientId }) {
    clientId = clientId.toString()
    const socket = await _getClientSocket(clientId)

    if (socket) {
        logger.info(`Emiting event: ${type} to client: ${clientId} socket [id: ${socket.id}]`)
        socket.emit(type, data)
    } else {
        logger.info(`No active socket for client: ${clientId}`)
        // _printSockets()
    }
}

// If possible, send to all sockets BUT not the current socket 
// Optionally, broadcast to a room / to all
async function broadcast({ type, data, room = null, clientId }) {
    clientId = clientId && clientId.toString()
    
    logger.info(`Broadcasting event: ${type}`)
    const excludedSocket = clientId ? await _getClientSocket(clientId) : null
    if (room && excludedSocket) {
        logger.info(`Broadcast to room ${room} excluding client: ${clientId}`)
        excludedSocket.broadcast.to(room).emit(type, data)
    } else if (excludedSocket) {
        logger.info(`Broadcast to all excluding client: ${clientId}`)
        excludedSocket.broadcast.emit(type, data)
    } else if (room) {
        logger.info(`Emit to room: ${room}`)
        gIo.to(room).emit(type, data)
    } else {
        logger.info(`Emit to all`)
        gIo.emit(type, data)
    }
}

async function _getClientSocket(clientId) {
    const sockets = await _getAllSockets()
    const socket = sockets.find(s => s.clientId === clientId)
    return socket
}

async function _getAllSockets() {
    // return all Socket instances
    const sockets = await gIo.fetchSockets()
    return sockets
}

async function _printSockets() {
    const sockets = await _getAllSockets()
    console.log(`Sockets: (count: ${sockets.length}):`)
    sockets.forEach(_printSocket)
}

function _printSocket(socket) {
    console.log(`Socket - socketId: ${socket.id} clientId: ${socket.clientId}`)
}

export const socketService = {
    // set up the sockets service and define the API
    setupSocketAPI,
    // emit to everyone / everyone in a specific room (label)
    emitTo, 
    // emit to a specific client (if currently active in system)
    emitToClient, 
    // Send to all sockets BUT not the current socket - if found
    // (otherwise broadcast to a room / to all)
    broadcast,
}