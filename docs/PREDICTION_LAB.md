# Prediction Intelligence Lab

The Prediction Intelligence Lab adds a reproducible evaluation surface on top of GoalAI's existing Poisson + Dixon-Coles match model.

## What it does

For a selected fixture, the Lab:

1. Builds the existing GoalAI probability matrix.
2. Samples that matrix with a deterministic seeded PRNG.
3. Runs 1,000–100,000 virtual matches.
4. Aggregates outcome probabilities.
5. Aggregates exact scoreline frequencies.
6. Calculates expected goals and empirical goal variance.
7. Calculates exact-score entropy as an uncertainty indicator.
8. Verifies basic probability invariants.

## Reproducibility

The Lab deliberately separates **model generation** from **random sampling**.

The existing predictor remains responsible for constructing the probability distribution. The Lab then samples that distribution using a seeded linear-congruential generator.

Therefore:

```
same inputs + same model + same seed
        =
same simulation results
```

This makes experiments reproducible and makes regression testing possible.

## Interpretation

Monte Carlo frequencies are empirical estimates, not guarantees about real matches. Increasing the simulation count reduces sampling noise but does not make the underlying model more accurate.

The Lab currently inherits the existing model assumptions, including the configured team ratings, average-goal baseline, host modifier, and Dixon-Coles low-score correction.

## Engineering contract

The model should satisfy:

- outcome probabilities sum approximately to 1
- probabilities remain within [0, 1]
- expected goals are non-negative
- entropy is non-negative
- seeded runs are reproducible

Run the model checks with:

```bash
npm run test:model
```

Run the type-check plus model checks with:

```bash
npm run test:lab
```
