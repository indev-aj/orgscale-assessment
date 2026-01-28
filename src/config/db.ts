import pkg from 'pg';
import CONSTANTS from './constants';

const { Pool } = pkg;

const Sql = new Pool({
    connectionString: CONSTANTS.DATABASE_URL
});

export { Sql };