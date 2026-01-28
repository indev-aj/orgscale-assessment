"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sql = void 0;
const pg_1 = __importDefault(require("pg"));
const constants_1 = __importDefault(require("./constants"));
const { Pool } = pg_1.default;
const Sql = new Pool({
    connectionString: constants_1.default.DATABASE_URL
});
exports.Sql = Sql;
