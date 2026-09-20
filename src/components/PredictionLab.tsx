import React, { useMemo, useState } from 'react';
import { BarChart3, FlaskConical, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { ENRICHED_TEAMS } from '../utils/predictor';
import { PredictionLabResult, RobustnessReport, analyzePredictionRobustness, runPredictionLab, verifyLabInvariants } from '../utils/predictionLab';
import TeamSelect from './TeamSelect';

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function PredictionLab() {
  const [teamA, setTeamA] = useState('ARG');
  const [teamB, setTeamB] = useState('FRA');
  const [simulations, setSimulations] = useState(10000);
  const [seed, setSeed] = useState(20260920);
  const [result, setResult] = useState<PredictionLabResult | null>(null);
  const [robustness, setRobustness] = useState<RobustnessReport | null>(null);

  const teams = useMemo(() => ENRICHED_TEAMS, []);
  const run = () => {
    const config = { teamA, teamB, simulations, seed };
    setResult(runPredictionLab(config));
    setRobustness(analyzePredictionRobustness(config));
  };
  const errors = result ? verifyLabInvariants(result) : [];

  return (
    <div className="space-y-6 animate-fade-in" id="prediction-lab">
      <section className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-[#A3E635] font-mono text-[10px] font-black uppercase tracking-widest">
              <FlaskConical className="w-4 h-4" /> Prediction Intelligence Lab
            </div>
            <h2 className="text-xl font-black text-white font-outfit mt-1">Stress-test the model, not just the prediction.</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Deterministic Monte Carlo sampling over GoalAI's existing Poisson + Dixon-Coles probability matrix.
              Same seed + same inputs = reproducible results.
            </p>
          </div>
          {result && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> MODEL INVARIANTS: {errors.length ? 'CHECK FAILED' : 'PASS'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TeamSelect id="lab-team-a" teams={teams} selectedCode={teamA} onChange={setTeamA} excludeCode={teamB} />
          <TeamSelect id="lab-team-b" teams={teams} selectedCode={teamB} onChange={setTeamB} excludeCode={teamA} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <label className="bg-[#05070B] border border-[#1E293B] rounded-xl p-3">
            <span className="block text-[10px] text-slate-500 uppercase font-mono mb-2">Simulations</span>
            <select value={simulations} onChange={e => setSimulations(Number(e.target.value))}
              className="w-full bg-transparent text-white font-mono text-sm focus:outline-none">
              <option value={1000}>1,000</option><option value={10000}>10,000</option>
              <option value={50000}>50,000</option><option value={100000}>100,000</option>
            </select>
          </label>
          <label className="bg-[#05070B] border border-[#1E293B] rounded-xl p-3">
            <span className="block text-[10px] text-slate-500 uppercase font-mono mb-2">Seed</span>
            <input value={seed} onChange={e => setSeed(Number(e.target.value) || 0)}
              className="w-full bg-transparent text-white font-mono text-sm focus:outline-none" />
          </label>
          <button onClick={run}
            className="bg-[#A3E635] hover:bg-[#b2f048] text-slate-950 rounded-xl font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Run Lab
          </button>
        </div>
      </section>

      {result && (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['Team A xG', result.expectedGoalsA.toFixed(2)],
              ['Team B xG', result.expectedGoalsB.toFixed(2)],
              ['A Win', fmtPct(result.outcomeProbabilities.winA)],
              ['Draw', fmtPct(result.outcomeProbabilities.draw)],
              ['B Win', fmtPct(result.outcomeProbabilities.winB)]
            ].map(([label, value]) => (
              <div key={label} className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4">
                <div className="text-[9px] uppercase font-mono text-slate-500">{label}</div>
                <div className="text-xl font-black text-white mt-1">{value}</div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Outcome Distribution</h3>
              </div>
              {[
                ['Team A', result.outcomeProbabilities.winA],
                ['Draw', result.outcomeProbabilities.draw],
                ['Team B', result.outcomeProbabilities.winB]
              ].map(([label, value]) => (
                <div key={String(label)} className="mb-4">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>{label}</span><span>{fmtPct(Number(value))}</span>
                  </div>
                  <div className="h-3 rounded-full bg-[#05070B] overflow-hidden">
                    <div className="h-full bg-[#A3E635]" style={{ width: `${Number(value) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-5 pt-4 border-t border-[#1E293B] grid grid-cols-3 gap-3 text-center">
                <div><div className="text-[9px] text-slate-500 uppercase">Entropy</div><div className="font-mono text-white">{result.exactScoreEntropy.toFixed(2)} bits</div></div>
                <div><div className="text-[9px] text-slate-500 uppercase">Variance A</div><div className="font-mono text-white">{result.varianceA.toFixed(2)}</div></div>
                <div><div className="text-[9px] text-slate-500 uppercase">Variance B</div><div className="font-mono text-white">{result.varianceB.toFixed(2)}</div></div>
              </div>
            </div>

            <div className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-bold text-white">Most Likely Scorelines</h3>
              </div>
              <div className="space-y-2">
                {result.topScores.slice(0, 7).map((item, i) => (
                  <div key={item.score} className="flex items-center gap-3">
                    <span className="w-5 text-[10px] font-mono text-slate-600">#{i + 1}</span>
                    <span className="w-12 text-center bg-[#05070B] border border-[#1E293B] rounded-lg py-1 font-mono text-white">{item.score}</span>
                    <div className="flex-1 h-2 bg-[#05070B] rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, item.probability * 500)}%` }} />
                    </div>
                    <span className="w-14 text-right text-[10px] font-mono text-slate-400">{fmtPct(item.probability)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {robustness && (
            <section className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-white">Robustness & Sensitivity</h3>
                  <p className="text-[10px] text-slate-500 mt-1">95% Wilson intervals and controlled ±5% model perturbations.</p>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase font-mono text-slate-500">Stability Score</div>
                  <div className="text-lg font-black text-cyan-400">{(robustness.stabilityScore * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
                {([
                  ['Team A', robustness.outcomeIntervals.winA],
                  ['Draw', robustness.outcomeIntervals.draw],
                  ['Team B', robustness.outcomeIntervals.winB]
                ] as const).map(([label, interval]) => (
                  <div key={label} className="bg-[#05070B] border border-[#1E293B] rounded-xl p-3">
                    <div className="text-[9px] uppercase font-mono text-slate-500">{label} 95% interval</div>
                    <div className="text-white font-mono text-sm mt-1">{fmtPct(interval.lower)} — {fmtPct(interval.upper)}</div>
                    <div className="text-[9px] text-slate-600 mt-1">estimate {fmtPct(interval.estimate)}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {robustness.scenarios.map(scenario => (
                  <div key={scenario.name} className="grid grid-cols-[110px_1fr_auto] gap-3 items-center bg-[#05070B] border border-[#1E293B] rounded-lg p-3">
                    <div>
                      <div className="text-[10px] font-bold text-white">{scenario.name}</div>
                      <div className="text-[8px] text-slate-600">{scenario.description}</div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">A {fmtPct(scenario.winA)} · D {fmtPct(scenario.draw)} · B {fmtPct(scenario.winB)}</div>
                    <div className="text-[9px] font-mono text-cyan-400">ΔA {scenario.deltaWinA >= 0 ? '+' : ''}{fmtPct(scenario.deltaWinA)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-[#0B0F19] border border-[#1E293B] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Goal Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {result.goalDistribution.map(row => (
                <div key={row.goals} className="grid grid-cols-[35px_1fr_55px] items-center gap-2 text-[10px] font-mono">
                  <span className="text-slate-500">{row.goals}G</span>
                  <div className="h-2 bg-[#05070B] rounded-full overflow-hidden">
                    <div className="h-full bg-[#A3E635]" style={{ width: `${row.probabilityA * 100}%` }} />
                  </div>
                  <span className="text-slate-400">{fmtPct(row.probabilityA)}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 font-mono mt-4">
              Seed {result.seed} • {result.simulations.toLocaleString()} simulations • checksum {result.modelChecksum}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
