export const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/html", "text/plain", "text/markdown", "application/msword",
  "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/x-flv", "video/mpeg", "video/x-ms-wmv", "video/3gpp"
]

export const stripQuickActions = (text: string) => text.replace(/\[QUICK_ACTIONS:[^\]]*\]/g, '').trim()
