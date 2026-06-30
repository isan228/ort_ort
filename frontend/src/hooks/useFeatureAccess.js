import { useEffect, useState } from 'react';
import { api, getStoredUser } from '../api/client.js';

export function useFeatureAccess() {
  const userId = getStoredUser()?.id ?? null;
  const loggedIn = Boolean(userId);
  const [loading, setLoading] = useState(loggedIn);
  const [access, setAccess] = useState({
    premium: false,
    has_scores: false,
    can_analyze: false,
    can_use_tours: false,
    can_view_rankings: false,
    analysis_blocked_reason: loggedIn ? null : 'auth',
  });

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      setAccess({
        premium: false,
        has_scores: false,
        can_analyze: false,
        can_use_tours: false,
        can_view_rankings: false,
        analysis_blocked_reason: 'auth',
      });
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    api
      .getAnalysisContext()
      .then((ctx) => {
        if (cancelled) return;
        setAccess({
          premium: Boolean(ctx.premium),
          has_scores: Boolean(ctx.has_scores),
          can_analyze: Boolean(ctx.can_analyze),
          can_use_tours: Boolean(ctx.can_use_tours),
          can_view_rankings: Boolean(ctx.can_view_rankings),
          analysis_blocked_reason: ctx.analysis_blocked_reason || null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAccess({
          premium: false,
          has_scores: false,
          can_analyze: false,
          can_use_tours: false,
          can_view_rankings: false,
          analysis_blocked_reason: 'subscription',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loggedIn, userId]);

  return { ...access, loading, loggedIn };
}
