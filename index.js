const express = require('express');
const contactRoutes = require('./routes/contactRoutes');
const cors = require('cors')
const app = express();
app.use(express.json());
app.use(cors())


app.use('/api' , contactRoutes);


const PORT = 3000;
app.listen(PORT , ()=>{
    console.log(`Server is runing at http://localhost:${PORT}`);
})




