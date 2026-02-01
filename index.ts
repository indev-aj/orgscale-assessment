import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mainRouter from './src/routes/index';

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
    origin: [
        'http://localhost:5173',
    ],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());

// Parse URL-encoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

app.use('/api', mainRouter);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
})