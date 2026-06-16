import { Router } from 'express';
import { runAnalysis, getAnalysisHistory, getAnalysisById, getAnalysisContext } from '../services/analysisService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/analysis/context', async (req, res, next) => {
  try {
    const context = await getAnalysisContext(req.userId);
    res.json(context);
  } catch (err) {
    next(err);
  }
});

router.post('/analysis', async (req, res, next) => {
  try {
    const { program_ids, main_score } = req.body;
    const result = await runAnalysis(req.userId, { program_ids, main_score });
    res.status(201).json({
      analysis_id: result.analysis.id,
      analysis: result.analysis,
      results: result.results,
      alternatives: result.alternatives,
      show_low_chance_flow: result.show_low_chance_flow,
      is_trial: result.is_trial,
      algorithm_version: result.algorithm_version,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/analysis/history', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const history = await getAnalysisHistory(req.userId, { limit, offset });
    res.json(history);
  } catch (err) {
    next(err);
  }
});

router.get('/analysis/:id', async (req, res, next) => {
  try {
    const analysis = await getAnalysisById(req.userId, req.params.id);
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

export default router;
