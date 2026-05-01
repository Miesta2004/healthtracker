import api from './client.ts'
import type {LoginCredentials, AuthTokens} from '../types'

export const login = async (credentials: LoginCredentials):Promise<AuthTokens> => {
    const response = await api.post('/auth/login/',credentials)
    return response.data
}