import axios from 'axios'

type BackendFieldError = {
  field: string
  message: string
}

type BackendErrorInfo = {
  code?: string
  message?: string
  fieldInfo?: BackendFieldError[]
}

type BackendErrorResponse = {
  error?: BackendErrorInfo | null
}

export type ApiError = {
  status?: number
  code?: string
  message: string
}

const DEFAULT_ERROR_MESSAGE = '요청 처리 중 문제가 발생했습니다'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isBackendErrorResponse = (value: unknown): value is BackendErrorResponse => {
  if (!isRecord(value)) {
    return false
  }

  const error = value.error
  return error === null || error === undefined || isRecord(error)
}

export const toApiError = (error: unknown): ApiError => {
  if (!axios.isAxiosError(error)) {
    return {
      message: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
    }
  }

  const status = error.response?.status
  const payload = error.response?.data

  if (!isBackendErrorResponse(payload) || !payload.error) {
    return {
      status,
      message: error.message || DEFAULT_ERROR_MESSAGE,
    }
  }

  const fieldMessages = payload.error.fieldInfo?.map(
    (fieldError) => `${fieldError.field}: ${fieldError.message}`,
  )

  return {
    status,
    code: payload.error.code,
    message:
      fieldMessages && fieldMessages.length > 0
        ? fieldMessages.join('\n')
        : payload.error.message || DEFAULT_ERROR_MESSAGE,
  }
}
