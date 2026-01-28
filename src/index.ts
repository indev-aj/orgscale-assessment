import express, { Request, Response, NextFunction } from 'express';
import mainRouter from './routes/index';

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api', mainRouter);

app.use('/', (req, res) => {
    return res.status(200).send('Say hello!');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
})