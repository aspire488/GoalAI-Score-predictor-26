import { runPredictionLab, verifyLabInvariants } from './predictionLab';

const a = runPredictionLab({ teamA: 'ARG', teamB: 'FRA', simulations: 10000, seed: 42 });
const b = runPredictionLab({ teamA: 'ARG', teamB: 'FRA', simulations: 10000, seed: 42 });

if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('Seeded simulations are not reproducible.');
if (verifyLabInvariants(a).length) throw new Error(verifyLabInvariants(a).join('\n'));
if (Math.abs(a.outcomeProbabilities.winA + a.outcomeProbabilities.draw + a.outcomeProbabilities.winB - 1) > 0.01) {
  throw new Error('Outcome probabilities do not sum to one.');
}
console.log('Prediction Lab self-test: PASS');
