import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import specsRouter from './routes/specs';
import envsRouter from './routes/envs';
import runnerRouter from './routes/runner';
import generatorRouter from './routes/generator';
import gitRouter from './routes/git';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'qa-pilot-server', version: '0.0.1' });
});

app.use('/api/specs', specsRouter);
app.use('/api/envs', envsRouter);
app.use('/api/runner', runnerRouter);
app.use('/api/generator', generatorRouter);
app.use('/api/git', gitRouter);

app.listen(config.port, () => {
  console.log(`QA Pilot Server đang chạy tại http://localhost:${config.port}`);
});

