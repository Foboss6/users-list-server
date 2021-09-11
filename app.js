import express from 'express';
import { HOST_NAME, PORT } from './variables.js';


const app = express();

// MIDDLEWARE
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json('All working');
})

app.listen(PORT, HOST_NAME, () => {
  console.log(`Server running at http://${HOST_NAME}:${PORT}/`);
});