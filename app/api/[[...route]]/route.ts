import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { exec } from 'child_process'

const app = new Hono().basePath('/api')

app.get('/initial-data', (c) => {
  // 这里应该是从实际的配置或环境中获取工作目录和数据库名称
  return c.json({
    workingDirectory: 'C:\\project\\ai\\ai-common-service',
    databaseName: 'ai-common-service-db-dev'
  })
})

app.post('/run-command', async (c) => {
  const { command, workingDirectory } = await c.req.json()
  console.log(`Received command: ${command} in directory: ${workingDirectory}`);
  return new Promise((resolve) => {
    exec(command, { cwd: workingDirectory }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`)
        resolve(c.json({ output: `Error: ${error.message}\n${stderr}` }, 500))
      } else {
        console.log(`Command output: ${stdout}`);
        resolve(c.json({ output: stdout }))
      }
    })
  })
})

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello Next.js!',
  })
})

export const GET = handle(app)
export const POST = handle(app)