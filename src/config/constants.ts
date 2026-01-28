import dotenv from 'dotenv';
dotenv.config();

const {
    DATABASE_URL,
} = process.env;

const CONSTANTS = {
    DATABASE_URL,
};

export default CONSTANTS;