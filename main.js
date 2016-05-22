const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const express = require('express');
const Mustache = require('mustache');
const pgp = require('pg-promise')();
const dbgeo = require('./other_mods/dbgeo-modified/dbgeo-modified.js');

//create express app and prepare db connection
const server = express();
const port = process.env.PORT || 3000;
const config = require('./config.js');
const db = pgp(config);

//use express static to serve up the frontend
server.use(express.static(__dirname + '/public'));

//expose sql endpoint, grab query as URL parameter and send it to the database
server.get('/sql', function(req, res){
  var sqlstr = req.query.q;
  var sqltoUpper = sqlstr.replace("from", "FROM");
  var sql = sqltoUpper.replace("FROM", ", st_transform(geom, 4326) as geom FROM");
  console.log('Executing SQL: ' + sql);

  //query using pg-promise
  db.any(sql)
    .then(function (data) { //use dbgeo to convert WKB from PostGIS into topojson
        return dbGeoParse(data);
    })
    .then(function (data) {
        res.send(data);
    })
    .catch(function (err) { //send the error message if the query didn't work
        var msg = err.message || err;
        console.log("ERROR:", msg);
        res.send({
            error: msg
        });
    });

});

server.use('/node_modules', express.static(__dirname + '/node_modules'));

function dbGeoParse(data) {
    return new Promise(function (resolve, reject) {
        dbgeo.parse({
            data: data,
            outputFormat: 'topojson',
            geometryColumn: 'geom',
            geometryType: 'wkb'
        }, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

//start the server
server.listen(port);
console.log('Listening on port ' + port + '...');


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow(
    {
      width: 1000,
      height: 800,
      minWidth: 1000,
      minHeight: 800
    }
  );

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/public/index.html');

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
