import Axios from 'axios'

const BASE_URL = process.env.NODE_ENV === 'production'
    ? '/api/'
    : '//localhost:3030/api/'

const axios = Axios.create({ withCredentials: true })

export const httpService = {
    get(endpoint, data) {
        return ajax(endpoint, 'GET', data)
    },
    post(endpoint, data) {
        return ajax(endpoint, 'POST', data)
    },
    put(endpoint, data) {
        return ajax(endpoint, 'PUT', data)
    },
    delete(endpoint, data) {
        return ajax(endpoint, 'DELETE', data)
    }
}

async function ajax(endpoint, method = 'GET', data = null) {
    try {
        const url = `${BASE_URL}${endpoint}`
        
        // For GET requests, ensure params are properly formatted
        let params = null
        if (method === 'GET' && data) {
            params = {}
            // Handle nested objects and ensure proper parameter formatting
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
                    params[key] = data[key]
                }
            })
        }
        
        const options = {
            url,
            method,
            params,
            paramsSerializer: {
                indexes: null // array format: a[0]=b&a[1]=c
            }
        }
        
        if (data && method !== 'GET') {
            options.data = data
        }

        const res = await axios(options)
        return res.data
    } catch (err) {
        console.log(`Had Issues ${method}ing to the backend, endpoint: ${endpoint}, with data: `, data)
        console.dir(err)
        if (err.response && err.response.status === 401) {
            sessionStorage.clear()
            window.location.assign('/')
        }
        throw err
    }
} 