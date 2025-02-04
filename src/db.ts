import fastifyMongo from '@fastify/mongodb';
import { FastifyInstance } from 'fastify';

export async function connectToDatabase(app: FastifyInstance) {
    await app.register(fastifyMongo, {
        url: 'mongodb://localhost:27017/kanji_db',
        forceClose: true,
    });
}