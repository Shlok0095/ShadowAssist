const { app } = require('electron')

app.whenReady().then(() => {
  try {
    const Database = require('better-sqlite3')
    const sqliteVec = require('sqlite-vec')
    const db = new Database(':memory:')
    sqliteVec.load(db)
    db.exec('CREATE VIRTUAL TABLE vectors USING vec0(embedding float[384])')
    db.close()
    console.log('ELECTRON_SQLITE_VEC_OK')
    app.exit(0)
  } catch (error) {
    console.error(error?.stack || error)
    app.exit(1)
  }
})
