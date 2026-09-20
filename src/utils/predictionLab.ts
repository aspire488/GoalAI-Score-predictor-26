import { MatchSimulationConfig, Team } from '../types';
import { ENRICHED_TEAMS, simulateMatch } from './predictor';

export interface LabConfig {
  teamA: string;
  teamB: string;
  simulations: number;
  seed?: number;
  hostToggle?: boolean;
  squadFormMultiplierA?: number;
  squadFormMultiplierB?: number;
  tacticalSetupMultiplierA?: number;
  tacticalSetupMultiplierB?: number;
  crowdSupportMultiplierA?: number;
  crowdSupportMultiplierB?: number;
}

export interface ScoreFrequency {
  score: string;
  teamAGoals: number;
  teamBGoals: number;
  probability: number;
  count: number;
}

export interface PredictionLabResult {
  teamA: Team;
  teamB: Team;
  simulations: number;
  seed: number;
  expectedGoalsA: number;
  expectedGoalsB: number;
  outcomeProbabilities: { winA: number; draw: number; winB: number };
  topScores: ScoreFrequency[];
  goalDistribution: { goals: number; probabilityA: number; probabilityB: number }[];
  exactScoreEntropy: number;
  mostLikelyOutcome: 'W' | 'D' | 'L';
  varianceA: number;
  varianceB: number;
  modelChecksum: string;
}

function seededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sampleMatrix(matrix: number[][], random: () => number): [number, number] {
  const target = random();
  let cumulative = 0;
  for (let a = 0; a < matrix.length; a++) {
    for (let b = 0; b < (matrix[a]?.length ?? 0); b++) {
      cumulative += matrix[a][b] ?? 0;
      if (target <= cumulative) return [a, b];
    }
  }
  return [matrix.length - 1, (matrix[matrix.length - 1]?.length ?? 1) - 1];
}

function entropy(probabilities: number[]): number {
  return probabilities.reduce((sum, p) => p > 0 ? sum - p * Math.log2(p) : sum, 0);
}

export function runPredictionLab(config: LabConfig): PredictionLabResult {
  const teamA = ENRICHED_TEAMS.find(t => t.code === config.teamA || t.name === config.teamA);
  const teamB = ENRICHED_TEAMS.find(t => t.code === config.teamB || t.name === config.teamB);
  if (!teamA || !teamB) throw new Error('Both teams must exist in the model dataset.');
  if (teamA.code === teamB.code) throw new Error('Team A and Team B must be different.');

  const simulations = Math.max(100, Math.min(100000, Math.floor(config.simulations)));
  const seed = config.seed ?? 20260920;
  const random = seededRng(seed);

  const modelConfig: MatchSimulationConfig = {
    teamA: teamA.code,
    teamB: teamB.code,
    tacticsA: 'Standard',
    tacticsB: 'Standard',
    formWeight: 0.5,
    injurySeverityA: 0,
    injurySeverityB: 0,
    neutralGround: !config.hostToggle,
    hostToggle: config.hostToggle,
    squadFormMultiplierA: config.squadFormMultiplierA ?? 1,
    squadFormMultiplierB: config.squadFormMultiplierB ?? 1,
    tacticalSetupMultiplierA: config.tacticalSetupMultiplierA ?? 1,
    tacticalSetupMultiplierB: config.tacticalSetupMultiplierB ?? 1,
    crowdSupportMultiplierA: config.crowdSupportMultiplierA ?? 1,
    crowdSupportMultiplierB: config.crowdSupportMultiplierB ?? 1
  };

  // simulateMatch constructs the validated Poisson/Dixon-Coles matrix used by the
  // existing application. We reuse that model and only replace its random draw.
  const model = simulateMatch(modelConfig);
  const scoreCounts = new Map<string, number>();
  const goalsA = new Map<number, number>();
  const goalsB = new Map<number, number>();
  let winA = 0, draw = 0, winB = 0;
  let sumA = 0, sumB = 0, sumA2 = 0, sumB2 = 0;

  for (let i = 0; i < simulations; i++) {
    const [a, b] = sampleMatrix(model.scoreMatrix, random);
    const key = `${a}-${b}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
    goalsA.set(a, (goalsA.get(a) ?? 0) + 1);
    goalsB.set(b, (goalsB.get(b) ?? 0) + 1);
    sumA += a; sumB += b; sumA2 += a * a; sumB2 += b * b;
    if (a > b) winA++; else if (a === b) draw++; else winB++;
  }

  const topScores = [...scoreCounts.entries()]
    .map(([score, count]) => {
      const [a, b] = score.split('-').map(Number);
      return { score, teamAGoals: a, teamBGoals: b, probability: count / simulations, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxGoals = Math.max(8, ...goalsA.keys(), ...goalsB.keys());
  const goalDistribution = Array.from({ length: maxGoals + 1 }, (_, goals) => ({
    goals,
    probabilityA: (goalsA.get(goals) ?? 0) / simulations,
    probabilityB: (goalsB.get(goals) ?? 0) / simulations
  }));

  const scoreProbabilities = [...scoreCounts.values()].map(v => v / simulations);
  const outcomeProbabilities = { winA: winA / simulations, draw: draw / simulations, winB: winB / simulations };
  const mostLikelyOutcome = winA >= draw && winA >= winB ? 'W' : draw >= winB ? 'D' : 'L';

  return {
    teamA,
    teamB,
    simulations,
    seed,
    expectedGoalsA: sumA / simulations,
    expectedGoalsB: sumB / simulations,
    outcomeProbabilities,
    topScores,
    goalDistribution,
    exactScoreEntropy: entropy(scoreProbabilities),
    mostLikelyOutcome,
    varianceA: Math.max(0, sumA2 / simulations - Math.pow(sumA / simulations, 2)),
    varianceB: Math.max(0, sumB2 / simulations - Math.pow(sumB / simulations, 2)),
    modelChecksum: [
      teamA.code, teamB.code,
      model.expectedGoalsA.toFixed(4), model.expectedGoalsB.toFixed(4),
      model.probabilities.winA.toFixed(6), model.probabilities.draw.toFixed(6), model.probabilities.winB.toFixed(6)
    ].join(':')
  };
}

export interface ProbabilityInterval {
  estimate: number;
  lower: number;
  upper: number;
}

export interface SensitivityScenario {
  name: string;
  description: string;
  winA: number;
  draw: number;
  winB: number;
  deltaWinA: number;
  deltaDraw: number;
  deltaWinB: number;
}

export interface RobustnessReport {
  baseline: PredictionLabResult;
  outcomeIntervals: {
    winA: ProbabilityInterval;
    draw: ProbabilityInterval;
    winB: ProbabilityInterval;
  };
  scenarios: SensitivityScenario[];
  stabilityScore: number;
}

function wilsonInterval(successes: number, trials: number, z = 1.96): ProbabilityInterval {
  const p = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const centre = (p + (z * z) / (2 * trials)) / denominator;
  const margin = (z / denominator) * Math.sqrt((p * (1 - p) / trials) + (z * z) / (4 * trials * trials));
  return {
    estimate: p,
    lower: Math.max(0, centre - margin),
    upper: Math.min(1, centre + margin)
  };
}

export function analyzePredictionRobustness(config: LabConfig): RobustnessReport {
  const baseline = runPredictionLab(config);
  const scenarios: Array<{ name: string; description: string; patch: Partial<LabConfig> }> = [
    {
      name: 'Attack +5%',
      description: 'Team A attacking output increased by 5%.',
      patch: { squadFormMultiplierA: (config.squadFormMultiplierA ?? 1) * 1.05 }
    },
    {
      name: 'Defense +5%',
      description: 'Team B defensive multiplier increased by 5%.',
      patch: { tacticalSetupMultiplierB: (config.tacticalSetupMultiplierB ?? 1) * 1.05 }
    },
    {
      name: 'Attack -5%',
      description: 'Team A attacking output reduced by 5%.',
      patch: { squadFormMultiplierA: (config.squadFormMultiplierA ?? 1) * 0.95 }
    }
  ];

  const evaluated = scenarios.map((scenario, index) => {
    const result = runPredictionLab({
      ...config,
      ...scenario.patch,
      seed: (config.seed ?? 20260920) + index + 1
    });
    return {
      name: scenario.name,
      description: scenario.description,
      winA: result.outcomeProbabilities.winA,
      draw: result.outcomeProbabilities.draw,
      winB: result.outcomeProbabilities.winB,
      deltaWinA: result.outcomeProbabilities.winA - baseline.outcomeProbabilities.winA,
      deltaDraw: result.outcomeProbabilities.draw - baseline.outcomeProbabilities.draw,
      deltaWinB: result.outcomeProbabilities.winB - baseline.outcomeProbabilities.winB
    };
  });

  const maxSwing = Math.max(
    ...evaluated.flatMap(s => [Math.abs(s.deltaWinA), Math.abs(s.deltaDraw), Math.abs(s.deltaWinB)])
  );
  const stabilityScore = Math.max(0, 1 - Math.min(1, maxSwing * 5));

  const n = baseline.simulations;
  const winA = Math.round(baseline.outcomeProbabilities.winA * n);
  const draw = Math.round(baseline.outcomeProbabilities.draw * n);
  const winB = n - winA - draw;

  return {
    baseline,
    outcomeIntervals: {
      winA: wilsonInterval(winA, n),
      draw: wilsonInterval(draw, n),
      winB: wilsonInterval(winB, n)
    },
    scenarios: evaluated,
    stabilityScore
  };
}

export function verifyLabInvariants(result: PredictionLabResult): string[] {
  const errors: string[] = [];
  const outcomeSum = result.outcomeProbabilities.winA + result.outcomeProbabilities.draw + result.outcomeProbabilities.winB;
  if (Math.abs(outcomeSum - 1) > 0.01) errors.push(`Outcome probabilities sum to ${outcomeSum}, not 1.`);
  if (result.expectedGoalsA < 0 || result.expectedGoalsB < 0) errors.push('Expected goals cannot be negative.');
  if (result.exactScoreEntropy < 0) errors.push('Entropy cannot be negative.');
  if (result.topScores.some(s => s.probability < 0 || s.probability > 1)) errors.push('Invalid score probability.');
  return errors;
}
