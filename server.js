const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { response } = require('express');

const urlencoded = app.use(bodyParser.urlencoded({ extended: false }))

//Connect to MongoDB Database
mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

//Check whether connection is success
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => console.log('Success DB connection!'))

//Create MongoDB Scheme - MongoDB'de Kullanıcı Şeması Oluştur
const exerciseTrackerSchema = new mongoose.Schema({
  username: String
})
//Create model from MongoDB schema created above - MongoDB'deki kullanıcı şemasından model oluştur
const exerciseTrackerModel = mongoose.model('exerciseTrackerModel', exerciseTrackerSchema)

//Create MongoDB Exercise Schema - MongoDB'de Exercise şeması oluştur
const exerciseCreatorSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
})


//Create MongoDB Exercise Model - MongoDB'de Exercise modeli oluştur
const exerciseCreatorModel = mongoose.model('exerciseCreatorModel', exerciseCreatorSchema)

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//Handle POST request - Kullanıcı oluşturmak için yapılab POST isteğini işle
app.post('/api/exercise/new-user', async (req, res, next) => {
  //On POST request made to API, create document instance from Mongoose model created above
  const createExerciseTrackerDocumentInstance = new exerciseTrackerModel({username: req.body.username})
  //Save the document intantance created by model above
  const createUserResult = await exerciseTrackerModel.findOne({username: createExerciseTrackerDocumentInstance.username}, (err, usernameQueryResult) => {
    if(err){
      return console.error(err)
    }else{
      if(usernameQueryResult === null){
        createExerciseTrackerDocumentInstance.save((err, exerciseTrackerDocumentInstance) => {
          if(err){
            return console.log(err)
          }else{
            console.log("hep burada")
            return exerciseTrackerDocumentInstance
          }
        })
      }else{
        return {error: "user already taken!"}
      }
    }
  })
  res.send({username: createUserResult.username, _id: createUserResult._id})
  next()
})

//Exercise oluşturmak için yapılan POST isteğini işle
app.post('/api/exercise/add', async (req, res, next) => {

  //POST isteğinin gövdesinde zaman yoksa bugünü yaz
  var dateData = null
  if(!req.body.date){
    var today = new Date()
    var year = today.getFullYear()
    var month = today.getMonth()+1
    if(today.getDate() < 10) {
      var day = "0" + today.getDate()
    }else{
      var day = today.getDate()
    }
    dateData = year + '-' + month + '-' + day
  }else{
    dateData = req.body.date
  }

  //Exercise için belge örneği oluştur
  const newExerciseCreatorDocumentInstance = new exerciseCreatorModel({
    userId: req.body.userId,
    description: req.body.description,
    duration: req.body.duration,
    date: dateData
  })

  //Exercise için oluşturulan belge örneğini kaydet
  await newExerciseCreatorDocumentInstance.save((err, exerciseCreatorDocumentInstance) => {
    if(err){
      return console.log(err)
    }else{
      exerciseCreatorModel.findById(exerciseCreatorDocumentInstance._id, (err, existingDocumentInstances) => {
        if (err) {
          console.error(err)
        } else {
          return console.log("finded document instances id:", existingDocumentInstances._id)
        }
      })
    }
  })

  res.send({
    userId: req.body.userId,
    description: req.body.description,
    duration: req.body.duration,
    date: dateData
  })

  next()

})

//Kullanıcıları listelemek için yapılan GET isteğini işle
app.get('/api/exercise/users', async (req, res, next) => {
  const usersQueryResult = await exerciseTrackerModel.find((err, users) => {
    if(err){
      return console.log(err)
    }else{
      return users
    }
  })
  res.send(Object.values(usersQueryResult).map(user => {
    return {
      username: user.username,
      _id: user._id
    }
  }))
  next()
})

//Exercise verilerini listelemek için yapılan GET isteğini işle
app.get('/api/exercise/log', async (req, res, next) => {
  const userIdQueryParam = req.query.userId
  const fromQueryParam = req.query.from.split('-').join(', ')
  const toQueryParam = req.query.to.split('-').join(', ')
  const limitQueryParam = req.query.limit
  const exerciseQueryResult = await exerciseCreatorModel.find({userId: userIdQueryParam, date: { $gte: fromQueryParam, $lte: toQueryParam }}, (err, exercises) => {
    if(err){
      return err
    }else{
      return exercises
    }
  }).limit(parseInt(limitQueryParam))
  var countObj = {count: exerciseQueryResult.length}
  exerciseQueryResult.push(countObj)
  res.send(exerciseQueryResult)
  next()
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
