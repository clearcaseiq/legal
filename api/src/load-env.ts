import path from 'path'
import dotenv from 'dotenv'

const candidates = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
]

for (const envPath of candidates) {
  dotenv.config({ path: envPath })
}
