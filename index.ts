import express, { Request, Response, NextFunction } from 'express';
import mainRouter from './src/routes/index';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Parse URL-encoded bodies (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

app.use('/api', mainRouter);

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
})