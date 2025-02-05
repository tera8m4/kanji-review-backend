import Fastify, { FastifyInstance } from 'fastify';
import { Kanji, ReviewState, Word } from './types';
import { calculateSrsInterval, calculateStsNextStage } from './srs';

const app: FastifyInstance = Fastify({ logger: true });

// Connect to MongoDB
app.register(require('@fastify/mongodb'), {
  // force to close the mongodb connection when app stopped
  // the default value is false
  forceClose: true,

  url: 'mongodb://localhost:27017/kanji_db'
});

// Add new kanji endpoint
app.post('/kanji', async function (request, reply) {
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

  const result = await this.mongo.db.collection<Kanji>('kanjis').insertOne(newKanji);
  return reply.code(201).send({ id: result?.insertedId });
});

// Update review state endpoint
app.post<{ Params: { id: string }, Body: { correct: boolean } }>(
  '/kanji/:id/review',
  async function (request, reply) {
    const { id } = request.params;
    const { correct } = request.body;

    const kanji = await this.mongo.db.collection<Kanji>('kanjis').findOne({
      _id: id,
    });

    if (!kanji) {
      return reply.code(404).send({ error: 'Kanji not found' });
    }

    const currentReview = kanji.review_state;
    const now = new Date();
    const update: ReviewState = Object.assign({}, kanji.review_state);
    update.last_review_time = now;
    update.stage = calculateStsNextStage(currentReview.stage, currentReview.incorrect_streak, correct);
    update.next_review_time = new Date(now.getTime() + calculateSrsInterval(update.stage));
    update.incorrect_streak = correct ? 0 : update.incorrect_streak + 1;

    await this.mongo.db?.collection<Kanji>('kanjis').updateOne(
      { _id: id },
      { $set: { review_state: update } }
    );

    return reply.code(200).send({ message: 'Review state updated' });
  }
);

app.get<{ Params: { id: string } }>('/kanji/:id/review', async function (req, res) {
  const { id } = req.params;

  try {
    const kanji = await this.mongo.db?.collection<Kanji>('kanjis').findOne({
      _id: id
    });

    if (!kanji) {
      return res.code(404).send({ error: 'Kanji not found' });
    }

    const response: { words: Word[] } = {
      words: [],
    };

    if (kanji.review_state.next_review_time < new Date()) {
      response.words = kanji.words;
    }

    return res.code(200).send(response);
  } catch (err) {
    if (err instanceof Error && err.message.includes('invalid input')) {
      return res.code(400).send({ error: 'Invalid Kanji ID format' });
    }
    return res.code(500).send({ error: 'Internal server error' });
  }
});

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