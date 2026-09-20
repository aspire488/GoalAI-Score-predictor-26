<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/608248ac-690a-4390-b62f-581455326eb5

## Prediction Intelligence Lab

GoalAI now includes a reproducible **Prediction Intelligence Lab** built on top of the existing Poisson + Dixon-Coles model. Run **1,000–100,000 deterministic Monte Carlo samples** for a fixture and inspect outcome probabilities, expected goals, scoreline distributions, variance, entropy, and model invariants.

Same inputs + same seed produce the same experiment, making the numerical layer testable and reproducible.

See [`docs/PREDICTION_LAB.md`](docs/PREDICTION_LAB.md) for the model contract and interpretation notes.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

### Engineering checks

- `npm run lint` — TypeScript validation
- `npm run test:model` — deterministic prediction-model self-test
- `npm run test:lab` — type-check + model self-test
- `npm run build` — production build
