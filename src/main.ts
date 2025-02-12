import Fastify, { FastifyInstance } from 'fastify';
import { Kanji, ReviewState, Word } from './types';
import { calculateSrsInterval, calculateStsNextStage } from './srs';
import cors from '@fastify/cors'; // Import the CORS plugin
import { ObjectId } from '@fastify/mongodb';

const app: FastifyInstance = Fastify({ logger: true });

// Register CORS to allow any domain
app.register(cors, {
  origin: '*', // Allow all domains
});

// Connect to MongoDB
app.register(require('@fastify/mongodb'), {
  // force to close the mongodb connection when app stopped
  // the default value is false
  forceClose: true,

  url: process.env.MONGO_URL || 'mongodb://localhost:27017/kanji_db'
});

// Add a new endpoint to get the list of kanjis
app.get('/kanji', async function (request, reply) {
  try {
    const kanjis = await this.mongo.db.collection<Kanji>('kanjis').find().toArray();

    // Map the results to only include the required fields
    const response = kanjis.map((k) => ({
      id: k._id,
      character: k.character, // assuming 'character' is a field in your Kanji type
      next_review_time: k.review_state.next_review_time,
    }));

    return reply.code(200).send(response);
  } catch (err) {
    return reply.code(500).send({ error: 'Internal server error' });
  }
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

app.delete<{ Params: { id: string } }>('/kanji/:id', async function (req, res) {
  const id = new ObjectId(req.params.id);
  const filter: any = {
    _id: id,
  };
  try {
    await this.mongo.db.collection<Kanji>('kanjis').deleteOne(filter);
    return res.code(200).send({ msg: "removed" });
  } catch (err) {
    return res.code(500).send({ error: 'Internal server error' });
  }
});

// Update review state endpoint
app.post<{ Params: { id: string }, Body: { correct: boolean } }>(
  '/kanji/:id/review',
  async function (request, reply) {
    const id = new ObjectId(request.params.id);
    const { correct } = request.body;

    const filter: any = {
      _id: id,
    };
    const kanji = await this.mongo.db.collection<Kanji>('kanjis').findOne(filter);

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
      filter,
      { $set: { review_state: update } }
    );

    return reply.code(200).send({ message: 'Review state updated' });
  }
);

app.get<{ Params: { id: string } }>('/kanji/:id/review', async function (req, res) {

  const id: ObjectId = new ObjectId(req.params.id)

  try {
    const filter: any = { _id: id };
    const kanji = await this.mongo.db.collection<Kanji>('kanjis').findOne(filter);

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

app.put<{ Params: { id: string }, Body: { character?: string; readings?: string[]; words?: Word[] } }>(
  '/kanji/:id',
  async function (request, reply) {
    const id = new ObjectId(request.params.id);
    const updateFields = request.body;

    // Validate that at least one field is provided to update
    if (!updateFields.character && !updateFields.readings && !updateFields.words) {
      return reply.code(400).send({ error: 'No update field provided' });
    }

    const filter: any = { _id: id };

    try {
      const updateResult = await this.mongo.db.collection<Kanji>('kanjis').updateOne(filter, { $set: updateFields });

      if (updateResult.matchedCount === 0) {
        return reply.code(404).send({ error: 'Kanji not found' });
      }

      return reply.code(200).send({ message: 'Kanji updated' });
    } catch (err) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  }
);

app.get<{ Params: { id: string } }>('/kanji/:id', async function (req, res) {
  const id = new ObjectId(req.params.id);
  const filter: any = { _id: id };
  try {
    const kanji = await this.mongo.db.collection<Kanji>('kanjis').findOne(filter);
    return res.code(200).send(kanji);
  } catch (err) {
    return res.code(404);
  }
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running on port 3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();