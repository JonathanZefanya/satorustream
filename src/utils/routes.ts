export const watchPath = (endpoint: string): string => `/watch/${encodeURIComponent(endpoint)}`

export const genrePath = (genre: string, page = 1): string =>
  `/genres/${encodeURIComponent(genre)}${page > 1 ? `?page=${page}` : ''}`
