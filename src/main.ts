import Fastify, { FastifyInstance } from 'fastify';
import { Kanji, ReviewState, Word } from './types';
import { connectToDatabase } from './db';
import { ObjectId } from 'mongodb';

const app: FastifyInstance = Fastify({ logger: true });

// Connect to MongoDB
app.register(connectToDatabase);

// Add new kanji endpoint
app.post('/kanji', async (request, reply) => {
  const kanji = request.body as Omit<Kanji, '_id' | 'review_state'>;
  const now = new Date();
  const defaultReviewState: ReviewState = {
    last_review_time: now,
    next_review_time: now,
    stage: 0,
    incorrect_streak: 0,
  };

  const newKanji: Kanji = {
    ...kanji,
    review_state: defaultReviewState,
  };

  const result = await app.mongo.db?.collection<Kanji>('kanjis').insertOne(newKanji);
  return reply.code(201).send({ id: result?.insertedId });
});

// Update review state endpoint
app.post<{ Params: { id: string }, Body: { correct: boolean } }>(
  '/kanji/:id/review',
  async (request, reply) => {
    const { id } = request.params;
    const { correct } = request.body;

    const kanji = await app.mongo.db?.collection<Kanji>('kanjis').findOne({
      _id: new ObjectId(id).toString(),
    });

    if (!kanji) {
      return reply.code(404).send({ error: 'Kanji not found' });
    }

    const currentReview = kanji.review_state;
    const now = new Date();
    let update: ReviewState = Object.assign({}, kanji.review_state);
    update.last_review_time = now;

    if (correct) {
      const nextStage = currentReview.stage + 1;
      const interval = 24 * 60 * 60 * 1000 * Math.pow(2, nextStage); // Exponential spacing
      update = {
        ...update,
        stage: nextStage,
        incorrect_streak: 0,
        next_review_time: new Date(now.getTime() + interval),
      };
    } else {
      update = {
        ...update,
        incorrect_streak: currentReview.incorrect_streak + 1,
        stage: Math.max(0, currentReview.stage - 1),
        next_review_time: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Retry next day
      };
    }

    const objectId = new ObjectId(id);

    await app.mongo.db?.collection<Kanji>('kanjis').updateOne(
      { _id: objectId.toString() },
      { $set: { review_state: update } }
    );

    return reply.code(200).send({ message: 'Review state updated' });
  }
);

const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log('Server running on port 3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();