import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { chatRouter } from './routes/chat'
import './tools' // Register all tools

dotenv.config()

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/agent', chatRouter)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
