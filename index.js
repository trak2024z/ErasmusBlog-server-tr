const express = require('express');
const cors = require('cors');
const { connect } = require('mongoose');
require('dotenv').config();
const upload = require('express-fileupload');

const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const {notFound, errorMiddleware} = require('./middleware/errorMiddleware');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(upload())
app.use('/uploads', express.static(__dirname + '/uploads'))

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.use(notFound)
app.use(errorMiddleware)

const PORT = process.env.PORT || 4444;

connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(error => {
    console.error('Error connecting to the database', error);
  });
