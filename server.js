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
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: String, required: true },
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
  const createExerciseTrackerDocumentInstance = new exerciseTrackerModel({ username: req.body.username })
  //Save the document intantance created by model above
  await exerciseTrackerModel.find({ username: createExerciseTrackerDocumentInstance.username }, (err, usernameQueryResult) => {
    if (err) {
      return console.error(err)
    } else {
      return usernameQueryResult
    }
  }).then(response => {
    if (response.length > 0) {
      return "Üzgünüz, bu kullanıcı adı alınmış."
    } else {
      return createExerciseTrackerDocumentInstance.save().then(saveResponse => {
        return saveResponse
      })
    }
  }).then(result => {
    res.send(result)
  })
  next()
})

//Exercise oluşturmak için yapılan POST isteğini işle
app.post('/api/exercise/add', async (req, res, next) => {

  //Post isteğine dönecek yanıtı atayacağımız değişkeni tanımlıyoruz
  var responseBody = {}

  //POST isteğinin gövdesinde zaman yoksa bugünü yaz
  var dateData = null
  if (!req.body.date) {
    var today = new Date()
    var year = today.getFullYear()
    var month = today.getMonth() + 1
    if (today.getDate() < 10) {
      var day = "0" + today.getDate()
    } else {
      var day = today.getDate()
    }
    dateData = year + '-' + month + '-' + day
  } else {
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
  await newExerciseCreatorDocumentInstance.save()
    .then(data => {
      return data
    })
    .then(data => {
      return exerciseTrackerModel.findById(data.userId)
      .then(findResult => {
        return findResult.username
      })
      .then(username => {
        var strDate = data.date.toString().slice(0, 15)

        responseBody["_id"] = data.userId
        responseBody["username"] = username
        responseBody["date"] = strDate.toString()
        responseBody["duration"] = parseInt(data.duration)
        responseBody["description"] = data.description
        return responseBody
      })
      .catch(err => {if(err.message == "Cannot read property 'username' of null"){
        return responseBody = "Girile ID numarasına sahip bir kullanıcı bulunamadı."
      }})
    })
    .catch(err => {
      Object.values(err.errors).map(error => {
        return responseBody = error.message
      })
    })
    .finally(() => res.send(responseBody))

  next()

})

//Kullanıcıları listelemek için yapılan GET isteğini işle
app.get('/api/exercise/users', async (req, res, next) => {
  const usersQueryResult = await exerciseTrackerModel.find((err, users) => {
    if (err) {
      return console.log(err)
    } else {
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
  const exerciseQueryResult = await exerciseCreatorModel.find({ userId: userIdQueryParam, date: { $gte: fromQueryParam, $lte: toQueryParam } }, (err, exercises) => {
    if (err) {
      return err
    } else {
      return exercises
    }
  }).limit(parseInt(limitQueryParam))
  var countObj = { count: exerciseQueryResult.length }
  exerciseQueryResult.push(countObj)
  res.send(exerciseQueryResult)
  next()
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
